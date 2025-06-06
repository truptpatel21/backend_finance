const connection = require('../../../config/database');
const common = require('../../../utilities/common');
const error_code = require('../../../utilities/request-error-code');
const bcrypt = require('bcrypt');

class UserModel {
  // User/device logic
  async getUserWithDevice(body) {
    const { user_id } = body;
    const [user] = await connection.promise().query(
      'SELECT id, name, email, role, address, is_active, created_at, updated_at FROM users WHERE id = ? AND is_deleted = 0 AND is_active = 1',
      [user_id]
    );
    if (!user.length) return null;

    const [devices] = await connection.promise().query(
      'SELECT id, user_id, device_type, token, created_at, updated_at FROM devices WHERE user_id = ? AND is_deleted = 0',
      [user_id]
    );
    return {
      user: user[0],
      devices: devices || []
    };
  }

  async register(body) {
    try {
      const saltRounds = 10;
      const encryptedPassword = await bcrypt.hash(body.password, saltRounds);
      const userData = {
        name: body.name,
        email: body.email,
        password: encryptedPassword,
        role: body.role || 'user',
        address: body.address || null,
        is_active: 1,
        is_deleted: 0
      };
      const [existingUser] = await connection.promise().query(
        'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
        [userData.email]
      );
      if (existingUser.length > 0) return { code: error_code.OPERATION_FAILED, messages: "Email is already registered." };

      const [result] = await connection.promise().query('INSERT INTO users SET ?', userData);
      const jwt = common.generateJwt({ id: result.insertId, email: userData.email, role: userData.role });
      const encryptedjwt = common.encrypt({ jwt });

      await connection.promise().query('INSERT INTO devices SET ?', { user_id: result.insertId, device_type: body.device_type || "", token: encryptedjwt });

      const userWithDevice = await this.getUserWithDevice({ user_id: result.insertId });

      common.sendWelcomeMail({
        to_email: userData.email,
        user_name: userData.name
      });

      return { code: error_code.SUCCESS, messages: "Registration successful.", data: { ...userWithDevice, encryptedjwt } };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async login(body) {
    try {
      const [users] = await connection.promise().query(
        'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
        [body.email]
      );
      if (!users.length) {
        return { code: error_code.OPERATION_FAILED, messages: "Invalid email, user does not exist." };
      }
      const user = users[0];
      if (user.is_active === 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Your account has been blocked by admin." };
      }
      const isPasswordValid = await bcrypt.compare(body.password, user.password);
      if (!isPasswordValid) {
        return { code: error_code.NO_DATA_FOUND, messages: "Wrong password." };
      }
      const jwt = common.generateJwt({ id: user.id, role: user.role });
      const encryptedjwt = common.encrypt({ jwt });

      await connection.promise().query('UPDATE devices SET token = ? WHERE user_id = ? AND is_deleted = 0', [encryptedjwt, user.id]);

      const userWithDevice = await this.getUserWithDevice({ user_id: user.id });

      common.sendLoginMail({
        to_email: user.email,
        user_name: user.name,
        device_info: userWithDevice.devices
      });

      return { code: error_code.SUCCESS, messages: "Login successful.", data: { ...userWithDevice, encryptedjwt } };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }


  async generateResetToken(email) {
    try {
      const [users] = await connection.promise().query(
        'SELECT id, name FROM users WHERE email = ? AND is_deleted = 0',
        [email]
      );
      if (!users.length) {
        return { code: 0, messages: "Email not found." };
      }

      const user = users[0];
      // const token = crypto.randomBytes(32).toString('hex');
      const token = common.generateRandomToken ? common.generateRandomToken(64) : require('crypto').randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await connection.promise().query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [
        user.id, token, expires_at
      ]);

      return { code: 1, messages: "Reset link sent.", data: { name: user.name, token } };
    } catch (err) {
      return { code: 0, messages: err.message };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const [rows] = await connection.promise().query(
        'SELECT user_id FROM password_resets WHERE token = ? AND expires_at > NOW() LIMIT 1',
        [token]
      );

      if (!rows.length) return { code: 0, messages: "Invalid or expired token." };

      const hashed = await bcrypt.hash(newPassword, 10);
      await connection.promise().query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
        hashed, rows[0].user_id
      ]);

      await connection.promise().query('DELETE FROM password_resets WHERE token = ?', [token]);

      return { code: 1, messages: "Password reset successful." };
    } catch (err) {
      return { code: 0, messages: err.message };
    }
  }


  

  

  async changePassword(body) {
    try {
      const { user_id, old_password, new_password } = body;
      const [user] = await connection.promise().query(
        'SELECT password FROM users WHERE id = ? AND is_deleted = 0 AND is_active = 1',
        [user_id]
      );
      if (!user.length) return { code: error_code.NO_DATA_FOUND, messages: "User not found or inactive." };

      const isPasswordValid = await bcrypt.compare(old_password, user[0].password);
      if (!isPasswordValid) {
        return { code: error_code.OPERATION_FAILED, messages: "Current password is incorrect." };
      }
      if (old_password === new_password) {
        return { code: error_code.OPERATION_FAILED, messages: "New password cannot be the same as current password." };
      }
      const encryptedNewPassword = await bcrypt.hash(new_password, 10);
      await connection.promise().query(
        'UPDATE users SET password = ?, updated_at = ? WHERE id = ? AND is_deleted = 0 AND is_active = 1',
        [encryptedNewPassword, new Date(), user_id]
      );
      return { code: error_code.SUCCESS, messages: "Password changed successfully." };
    } catch (error) {
      return { code: error_code.OPERATION_FAILED, messages: error.message }
    }
  }

  async logout(body) {
    try {
      const { token } = body;
      const [result] = await connection.promise().query(
        'UPDATE devices SET token = NULL WHERE token = ? AND is_deleted = 0',
        [token]
      );
      if (!result.affectedRows) {
        return { code: error_code.OPERATION_FAILED, messages: "No device found with this token." };
      }
      return { code: error_code.SUCCESS, messages: "Logout successful." };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getProfile(body) {
    try {
      const { user_id } = body;
      const userWithDevice = await this.getUserWithDevice({ user_id });
      if (!userWithDevice) return { code: error_code.NO_DATA_FOUND, messages: "User not found or inactive." };
      return { code: error_code.SUCCESS, messages: "Profile fetched.", data: userWithDevice };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async updateProfile(body) {
    try {
      const { user_id, name, address } = body;
      const updateData = {};

      if (typeof name === 'string' && name.trim() !== '') updateData.name = name.trim();
      if (typeof address === 'string' && address.trim() !== '') updateData.address = address.trim();

      if (Object.keys(updateData).length === 0) {
        return { code: error_code.NO_DATA_FOUND, messages: "Nothing to update." };
      }

      updateData.updated_at = new Date();

      const [result] = await connection.promise().query(
        'UPDATE users SET ? WHERE id = ? AND is_deleted = 0 AND is_active = 1',
        [updateData, user_id]
      );
      if (!result.affectedRows) return { code: 404, messages: "User not found or inactive." };
      const userWithDevice = await this.getUserWithDevice({ user_id });
      return { code: error_code.SUCCESS, messages: "Profile updated.", data: userWithDevice };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async fetchUsers() {
    try {
      const [users] = await connection.promise().query(
        'SELECT id, name, email, role, address, is_active, is_deleted, created_at, updated_at FROM users'
      );
      if (!users.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No users found." };
      }
      return { code: error_code.SUCCESS, messages: "Users fetched successfully.", data: users };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async updateUserByAdmin(body) {
    try {
      const { user_id } = body;
      const updateData = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;
      if (body.is_deleted !== undefined) updateData.is_deleted = body.is_deleted;
      updateData.updated_at = new Date();

      if (Object.keys(updateData).length === 1) {
        return { code: error_code.NO_DATA_FOUND, messages: "No fields provided for update." };
      }
      const [result] = await connection.promise().query('UPDATE users SET ? WHERE id = ? ', [updateData, user_id]);
      if (!result.affectedRows) return { code: error_code.NO_DATA_FOUND, messages: "User not found." };
      const [updatedUser] = await connection.promise().query(
        'SELECT id, name, email, role, address, is_active, is_deleted, created_at, updated_at FROM users WHERE id = ? ',
        [user_id]
      );
      return { code: error_code.SUCCESS, messages: "User updated successfully.", data: updatedUser[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Category Management
  async addCategory(body) {
    try {
      const { user_id, name, type, parent_id } = body;
      if (!name || !type) {
        return { code: error_code.OPERATION_FAILED, messages: "Category name and type are required." };
      }
      const [existingCategory] = await connection.promise().query(
        'SELECT * FROM categories WHERE name = ? AND user_id = ? AND is_deleted = 0',
        [name, user_id]
      );
      if (existingCategory.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Category already exists." };
      }
      if (parent_id) {
        const [parent] = await connection.promise().query(
          'SELECT id FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL) AND is_deleted = 0',
          [parent_id, user_id]
        );
        if (!parent.length) {
          return { code: error_code.OPERATION_FAILED, messages: "Parent category does not exist." };
        }
      }
      const categoryData = {
        user_id,
        name,
        type,
        parent_id: parent_id || null,
        is_active: 1,
        is_deleted: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const [result] = await connection.promise().query('INSERT INTO categories SET ?', categoryData);
      const [category] = await connection.promise().query('SELECT * FROM categories WHERE id = ? AND is_deleted = 0', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Category added.", data: category[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  

  async getCategories(body) {
    try {
      const { user_id } = body;
      const [categories] = await connection.promise().query(
        'SELECT * FROM categories WHERE (user_id = ? OR user_id IS NULL) AND is_deleted = 0 AND is_active = 1',
        [user_id]
      );
      if (categories.length === 0) {
        return { code: error_code.NO_DATA_FOUND, messages: "No categories found." };
      }
      return { code: error_code.SUCCESS, messages: "Categories fetched successfully.", data: categories };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Transaction Management
  // ...existing code...
  async addTransaction(body) {
    try {
      const { user_id, category_id, amount, type, transaction_date, note, is_recurring, reference_id } = body;

      // Check for positive amount
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Amount must be a positive number." };
      }

      // Check for valid type
      if (!['income', 'expense'].includes(type)) {
        return { code: error_code.OPERATION_FAILED, messages: "Transaction type must be 'income' or 'expense'." };
      }

      // Check for valid date (not in the future for expense, not in the past for future-related)
      const now = new Date();
      const txDate = new Date(transaction_date);
      if (isNaN(txDate.getTime())) {
        return { code: error_code.OPERATION_FAILED, messages: "Invalid transaction date." };
      }
      if (txDate > now) {
        return { code: error_code.OPERATION_FAILED, messages: "Transaction date cannot be in the future." };
      }

      // Check category exists and is active/not deleted
      const [category] = await connection.promise().query(
        'SELECT id FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL) AND is_deleted = 0 AND is_active = 1',
        [category_id, user_id]
      );
      if (!category.length) {
        return { code: error_code.OPERATION_FAILED, messages: "Category does not exist or is inactive." };
      }

      // If reference_id is provided, check it exists
      if (reference_id) {
        const [refTx] = await connection.promise().query(
          'SELECT id FROM transactions WHERE id = ? AND user_id = ? AND is_deleted = 0',
          [reference_id, user_id]
        );
        if (!refTx.length) {
          return { code: error_code.OPERATION_FAILED, messages: "Reference transaction does not exist." };
        }
      }

      // If is_recurring, check recurring_transactions exists
      if (is_recurring) {
        const [recurring] = await connection.promise().query(
          'SELECT id FROM recurring_transactions WHERE category_id = ? AND user_id = ?',
          [category_id, user_id]
        );
        if (!recurring.length) {
          return { code: error_code.OPERATION_FAILED, messages: "No recurring transaction setup for this category." };
        }
      }

      const transactionData = {
        user_id,
        category_id,
        amount,
        type,
        transaction_date,
        note: note || null,
        is_recurring: is_recurring || 0,
        reference_id: reference_id || null,
        is_deleted: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const [result] = await connection.promise().query('INSERT INTO transactions SET ?', transactionData);
      const [transaction] = await connection.promise().query('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', [result.insertId]);

      // --- Update goal's current_amount ---
      // Find the user's active goal (you can adjust this logic as needed)
      const [goals] = await connection.promise().query(
        'SELECT id, current_amount FROM goals WHERE user_id = ? ORDER BY deadline ASC LIMIT 1',
        [user_id]
      );
      if (goals.length > 0) {
        const goal = goals[0];
        let newAmount = Number(goal.current_amount);
        if (type === 'income') {
          newAmount += Number(amount);
        } else if (type === 'expense') {
          newAmount -= Number(amount);
        }
        // Prevent negative current_amount if you want
        newAmount = Math.max(0, newAmount);
        await connection.promise().query(
          'UPDATE goals SET current_amount = ?, updated_at = ? WHERE id = ?',
          [newAmount, new Date(), goal.id]
        );
      }
      // --- End goal update ---

      return { code: error_code.SUCCESS, messages: "Transaction added.", data: transaction[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }
  // ...existing code...

  async getTransactions(body) {
    try {
      const { user_id, type, category_id, start_date, end_date } = body;
      let query = 'SELECT t.*, c.name as category_name, c.type as category_type FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.is_deleted = 0';
      const params = [user_id];
      if (type) {
        query += ' AND t.type = ?';
        params.push(type);
      }
      if (category_id) {
        query += ' AND t.category_id = ?';
        params.push(category_id);
      }
      if (start_date && end_date) {
        query += ' AND t.transaction_date BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }
      query += ' AND c.is_deleted = 0 AND c.is_active = 1 ORDER BY t.transaction_date DESC';
      const [transactions] = await connection.promise().query(query, params);
      if (!transactions.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No transactions found." };
      }
      return { code: error_code.SUCCESS, messages: "Transactions fetched.", data: transactions };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Budget Management
  // ...existing code...
  async setBudget(body) {
    try {
      const { user_id, year, month, amount, alert_threshold } = body;

      // Validate year/month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear || (year == currentYear && month < currentMonth)) {
        return { code: error_code.OPERATION_FAILED, messages: "Budget year and month must be current or future." };
      }

      // Validate amount
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Budget amount must be positive." };
      }

      // Check for duplicate (per user, year, month, and category_id IS NULL)
      const [existing] = await connection.promise().query(
        'SELECT * FROM budgets WHERE user_id = ? AND year = ? AND month = ? AND (category_id IS NULL OR category_id = 0) AND is_deleted = 0',
        [user_id, year, month]
      );
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Budget already set for this month." };
      }

      const budgetData = {
        user_id,
        year,
        month,
        amount,
        alert_threshold: alert_threshold,
        category_id: null, // explicitly set to null
        is_deleted: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const [result] = await connection.promise().query('INSERT INTO budgets SET ?', budgetData);
      const [budget] = await connection.promise().query('SELECT * FROM budgets WHERE id = ? AND is_deleted = 0', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Budget set.", data: budget[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }
  // ...existing code...

  async getBudgets(body) {
    try {
      const { user_id, year, month } = body;
      const [budgets] = await connection.promise().query(
        'SELECT * FROM budgets WHERE user_id = ? AND year = ? AND month = ? AND is_deleted = 0',
        [user_id, year, month]
      );
      if (!budgets.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No budgets found." };
      }
      return { code: error_code.SUCCESS, messages: "Budgets fetched.", data: budgets };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Notification Management
  async addNotification(body) {
    try {
      const { user_id, type, title, message, related_transaction_id } = body;
      if (!type || !title) {
        return { code: error_code.OPERATION_FAILED, messages: "Notification type and title are required." };
      }
      const notificationData = {
        user_id,
        type,
        title,
        message,
        is_read: 0,
        related_transaction_id: related_transaction_id || null,
        created_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO notifications SET ?', notificationData);
      const [notification] = await connection.promise().query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Notification added.", data: notification[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getNotifications(body) {
    try {
      const { user_id } = body;
      const [notifications] = await connection.promise().query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [user_id]
      );
      if (!notifications.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No notifications found." };
      }
      return { code: error_code.SUCCESS, messages: "Notifications fetched.", data: notifications };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // File Uploads
  async addUpload(body) {
    try {
      const { user_id, transaction_id, file_path, file_type, original_name } = body;
      if (!file_path) {
        return { code: error_code.OPERATION_FAILED, messages: "File path is required." };
      }
      const uploadData = {
        user_id,
        transaction_id: transaction_id || null,
        file_path,
        file_type,
        original_name,
        uploaded_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO uploads SET ?', uploadData);
      const [upload] = await connection.promise().query('SELECT * FROM uploads WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "File uploaded.", data: upload[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getUploads(body) {
    try {
      const { user_id, transaction_id } = body;
      let query = 'SELECT * FROM uploads WHERE user_id = ?';
      const params = [user_id];
      if (transaction_id) {
        query += ' AND transaction_id = ?';
        params.push(transaction_id);
      }
      const [uploads] = await connection.promise().query(query, params);
      if (!uploads.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No uploads found." };
      }
      return { code: error_code.SUCCESS, messages: "Uploads fetched.", data: uploads };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // User Settings
  async setUserSettings(body) {
    try {
      const { user_id, language, currency, notification_email, notification_push } = body;
      const [existing] = await connection.promise().query('SELECT * FROM user_settings WHERE user_id = ?', [user_id]);
      const settingsData = {
        language: language || 'en',
        currency: currency || 'USD',
        notification_email: notification_email !== undefined ? notification_email : 1,
        notification_push: notification_push !== undefined ? notification_push : 1,
        updated_at: new Date()
      };
      if (existing.length > 0) {
        await connection.promise().query('UPDATE user_settings SET ? WHERE user_id = ?', [settingsData, user_id]);
      } else {
        settingsData.user_id = user_id;
        settingsData.created_at = new Date();
        await connection.promise().query('INSERT INTO user_settings SET ?', settingsData);
      }
      return { code: error_code.SUCCESS, messages: "Settings updated." };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getUserSettings(body) {
    try {
      const { user_id } = body;
      const [settings] = await connection.promise().query('SELECT * FROM user_settings WHERE user_id = ?', [user_id]);
      if (!settings.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "Settings not found." };
      }
      return { code: error_code.SUCCESS, messages: "Settings fetched.", data: settings[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Recurring Transactions ---
  async addRecurringTransaction(body) {
    try {
      const { user_id, category_id, amount, frequency, next_due_date, end_date } = body;

      // Validate amount
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Amount must be a positive number." };
      }

      // Validate frequency
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
        return { code: error_code.OPERATION_FAILED, messages: "Invalid frequency." };
      }

      // Validate next_due_date (must be in the future)
      const now = new Date();
      const dueDate = new Date(next_due_date);
      if (isNaN(dueDate.getTime()) || dueDate <= now) {
        return { code: error_code.OPERATION_FAILED, messages: "Next due date must be in the future." };
      }
      if (end_date) {
        const endDateObj = new Date(end_date);
        if (isNaN(endDateObj.getTime()) || endDateObj <= dueDate) {
          return { code: error_code.OPERATION_FAILED, messages: "End date must be after next due date." };
        }
      }

      // Check for duplicate recurring transaction
      const [existing] = await connection.promise().query(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND category_id = ? AND frequency = ? AND next_due_date = ?',
        [user_id, category_id, frequency, next_due_date]
      );
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Recurring transaction already exists for this category and frequency." };
      }

      const data = {
        user_id,
        category_id,
        amount,
        frequency,
        next_due_date,
        end_date,
        created_at: new Date(),
        updated_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO recurring_transactions SET ?', data);
      const [rec] = await connection.promise().query('SELECT * FROM recurring_transactions WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Recurring transaction added.", data: rec[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getRecurringTransactions(body) {
    try {
      const { user_id } = body;
      const [rows] = await connection.promise().query('SELECT * FROM recurring_transactions WHERE user_id = ?', [user_id]);
      if (!rows.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No recurring transactions found." };
      }
      return { code: error_code.SUCCESS, messages: "Recurring transactions fetched.", data: rows };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Goals ---
  async addGoal(body) {
    try {
      const { user_id, name, target_amount, current_amount, deadline } = body;
      if (!name || !target_amount || !deadline) {
        return { code: error_code.OPERATION_FAILED, messages: "Goal name, target amount, and deadline are required." };
      }
      if (target_amount <= 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Target amount must be positive." };
      }
      const now = new Date();
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= now) {
        return { code: error_code.OPERATION_FAILED, messages: "Deadline must be a future date." };
      }
      const [existing] = await connection.promise().query(
        'SELECT * FROM goals WHERE name = ? AND user_id = ?', [name, user_id]
      );
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Goal with this name already exists." };
      }
      const data = {
        user_id,
        name,
        target_amount,
        current_amount: current_amount || 0,
        deadline,
        created_at: new Date(),
        updated_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO goals SET ?', data);
      const [goal] = await connection.promise().query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Goal added.", data: goal[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getGoals(body) {
    try {
      const { user_id } = body;
      const [rows] = await connection.promise().query('SELECT * FROM goals WHERE user_id = ?', [user_id]);
      if (rows.length === 0) {
        return { code: error_code.NO_DATA_FOUND, messages: "No goals found." };
      }
      return { code: error_code.SUCCESS, messages: "Goals fetched.", data: rows };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Tags ---
  async addTag(body) {
    try {
      const { user_id, name } = body;
      if (!name) {
        return { code: error_code.OPERATION_FAILED, messages: "Tag name is required." };
      }
      const [existing] = await connection.promise().query('SELECT * FROM tags WHERE name = ? AND user_id = ?', [name, user_id]);
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Tag already exists." };
      }
      const data = { name, user_id, created_at: new Date() };
      const [result] = await connection.promise().query('INSERT INTO tags SET ?', data);
      const [tag] = await connection.promise().query('SELECT * FROM tags WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Tag added.", data: tag[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getTags(body) {
    try {
      const { user_id } = body;
      const [tags] = await connection.promise().query('SELECT * FROM tags WHERE user_id = ?', [user_id]);
      if (!tags.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No tags found." };
      }
      return { code: error_code.SUCCESS, messages: "Tags fetched.", data: tags };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async addTransactionTag(body) {
    try {
      const { transaction_id, tag_id } = body;
      const [existing] = await connection.promise().query(
        'SELECT * FROM transaction_tags WHERE transaction_id = ? AND tag_id = ?', [transaction_id, tag_id]
      );
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Tag already linked to this transaction." };
      }
      const [result] = await connection.promise().query('INSERT INTO transaction_tags SET ?', { transaction_id, tag_id });
      return { code: error_code.SUCCESS, messages: "Tag linked to transaction." };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getTransactionTags(body) {
    try {
      const { transaction_id } = body;
      const [tags] = await connection.promise().query(
        'SELECT t.* FROM tags t JOIN transaction_tags tt ON t.id = tt.tag_id WHERE tt.transaction_id = ?', [transaction_id]
      );
      if (!tags.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No tags found for this transaction." };
      }
      return { code: error_code.SUCCESS, messages: "Transaction tags fetched.", data: tags };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Shared Budgets ---
  async addSharedBudget(body) {
    try {
      const { budget_id, shared_with_user_id } = body;
      // Check if already shared
      const [existing] = await connection.promise().query(
        'SELECT * FROM shared_budgets WHERE budget_id = ? AND shared_with_user_id = ?', [budget_id, shared_with_user_id]
      );
      if (existing.length > 0) {
        return { code: error_code.OPERATION_FAILED, messages: "Budget already shared with this user." };
      }
      const data = {
        budget_id,
        shared_with_user_id,
        created_at: new Date(),
        updated_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO shared_budgets SET ?', data);
      return { code: error_code.SUCCESS, messages: "Budget shared." };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getSharedBudgets(body) {
    try {
      const { user_id } = body;
      const [rows] = await connection.promise().query(
        'SELECT sb.*, b.* FROM shared_budgets sb JOIN budgets b ON sb.budget_id = b.id WHERE sb.shared_with_user_id = ? AND b.is_deleted = 0',
        [user_id]
      );
      if (!rows.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No shared budgets found." };
      }
      return { code: error_code.SUCCESS, messages: "Shared budgets fetched.", data: rows };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Reports ---
  async addReport(body) {
    try {
      const { user_id, report_type, start_date, end_date, file_path } = body;
      if (!report_type || !start_date || !end_date || !file_path) {
        return { code: error_code.OPERATION_FAILED, messages: "All report fields are required." };
      }
      const data = {
        user_id,
        report_type,
        start_date,
        end_date,
        file_path,
        created_at: new Date()
      };
      const [result] = await connection.promise().query('INSERT INTO reports SET ?', data);
      const [report] = await connection.promise().query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
      return { code: error_code.SUCCESS, messages: "Report added.", data: report[0] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getReports(body) {
    try {
      const { user_id } = body;
      const [reports] = await connection.promise().query('SELECT * FROM reports WHERE user_id = ?', [user_id]);
      if (!reports.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No reports found." };
      }
      return { code: error_code.SUCCESS, messages: "Reports fetched.", data: reports };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // --- Analytics & Summaries ---
  async getMonthlySummary({ user_id, year, month }) {
    try {
      const [income] = await connection.promise().query(
        `SELECT SUM(amount) as total_income FROM transactions WHERE user_id = ? AND type = 'income' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? AND is_deleted = 0`,
        [user_id, year, month]
      );
      const [expense] = await connection.promise().query(
        `SELECT SUM(amount) as total_expense FROM transactions WHERE user_id = ? AND type = 'expense' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? AND is_deleted = 0`,
        [user_id, year, month]
      );
      const total_income = income[0].total_income || 0;
      const total_expense = expense[0].total_expense || 0;
      const savings = total_income - total_expense;
      return {
        code: error_code.SUCCESS,
        messages: "Monthly summary fetched.",
        data: { total_income, total_expense, savings }
      };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getBudgetUtilization({ user_id, year, month }) {
    try {
      // Fetch overall budget for the month (category_id IS NULL)
      const [budgets] = await connection.promise().query(
        `SELECT id, amount as budget_amount, year, month
         FROM budgets
         WHERE user_id = ? AND year = ? AND month = ? AND is_deleted = 0 AND (category_id IS NULL OR category_id = 0)
         LIMIT 1`,
        [user_id, year, month]
      );
      if (!budgets.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No budget found for this period." };
      }
      const budget = budgets[0];

      // Calculate total expenses for the month
      const [spentRow] = await connection.promise().query(
        `SELECT SUM(amount) as spent
         FROM transactions
         WHERE user_id = ? AND type = 'expense' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? AND is_deleted = 0`,
        [user_id, year, month]
      );
      const spent = spentRow[0].spent || 0;
      budget.spent = spent;
      budget.remaining = budget.budget_amount - spent;
      budget.utilization_percent = budget.budget_amount > 0 ? ((spent / budget.budget_amount) * 100).toFixed(2) : 0;
      if (spent > budget.budget_amount) {
        budget.warning = "Budget exceeded!";
      }
      return { code: error_code.SUCCESS, messages: "Budget utilization fetched.", data: [budget] };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getUpcomingRecurring({ user_id }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT * FROM recurring_transactions WHERE user_id = ? AND next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 25 DAY)`,
        [user_id]
      );
      if (!rows.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No upcoming recurring transactions." };
      }
      return { code: error_code.SUCCESS, messages: "Upcoming recurring transactions fetched.", data: rows };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getTopSpendingCategories({ user_id, start_date, end_date }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT c.name as category, SUM(t.amount) as total_spent
             FROM transactions t
             JOIN categories c ON t.category_id = c.id
             WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ? AND t.is_deleted = 0 AND c.is_deleted = 0 AND c.is_active = 1
             GROUP BY t.category_id
             ORDER BY total_spent DESC
             LIMIT 5`,
        [user_id, start_date, end_date]
      );
      if (!rows.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No spending data found for this period." };
      }
      return { code: error_code.SUCCESS, messages: "Top spending categories fetched.", data: rows };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getGoalProgress({ user_id }) {
    try {
      const [goals] = await connection.promise().query(
        `SELECT id, name, target_amount, current_amount, deadline,
                (current_amount / target_amount) * 100 as progress_percent
             FROM goals WHERE user_id = ?`, [user_id]
      );
      if (!goals.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No goals found." };
      }
      return { code: error_code.SUCCESS, messages: "Goal progress fetched.", data: goals };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getCashFlowForecast({ user_id }) {
    try {
      // Get sum of recurring incomes and expenses for next month
      const [recurring] = await connection.promise().query(
        `SELECT 
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as recurring_income,
        SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as recurring_expense
      FROM recurring_transactions
      WHERE user_id = ? AND next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 MONTH)`,
        [user_id]
      );
      // Get average monthly net flow from last 3 months
      const [history] = await connection.promise().query(
        `SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND is_deleted = 0`,
        [user_id]
      );
      const avgNet = ((history[0].total_income || 0) - (history[0].total_expense || 0)) / 3;
      return {
        code: error_code.SUCCESS,
        messages: "Cash flow forecast calculated.",
        data: {
          recurring_income: recurring[0].recurring_income || 0,
          recurring_expense: Math.abs(recurring[0].recurring_expense || 0),
          avg_monthly_net: avgNet || 0,
          forecast_next_month: (recurring[0].recurring_income || 0) - Math.abs(recurring[0].recurring_expense || 0) + (avgNet || 0)
        }
      };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async getSpendingTrend({ user_id }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT 
        YEAR(transaction_date) as year,
        MONTH(transaction_date) as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ? AND is_deleted = 0 AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY year, month
      ORDER BY year DESC, month DESC`,
        [user_id]
      );
      if (!rows.length) {
        return { code: error_code.NO_DATA_FOUND, messages: "No trend data found." };
      }
      return { code: error_code.SUCCESS, messages: "Spending trend fetched.", data: rows.reverse() };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async compareCategorySpending({ user_id, start_date1, end_date1, start_date2, end_date2 }) {
    try {
      // First period
      const [period1] = await connection.promise().query(
        `SELECT c.name as category, SUM(t.amount) as spent
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ? AND t.is_deleted = 0 AND c.is_deleted = 0 AND c.is_active = 1
       GROUP BY t.category_id`,
        [user_id, start_date1, end_date1]
      );
      // Second period
      const [period2] = await connection.promise().query(
        `SELECT c.name as category, SUM(t.amount) as spent
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ? AND t.is_deleted = 0 AND c.is_deleted = 0 AND c.is_active = 1
       GROUP BY t.category_id`,
        [user_id, start_date2, end_date2]
      );
      // Merge results for comparison
      const result = {};
      period1.forEach(row => result[row.category] = { period1: row.spent, period2: 0 });
      period2.forEach(row => {
        if (!result[row.category]) result[row.category] = { period1: 0, period2: row.spent };
        else result[row.category].period2 = row.spent;
      });
      return { code: error_code.SUCCESS, messages: "Category comparison fetched.", data: result };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  async predictGoalAchievement({ user_id }) {
    try {
      // Get average monthly savings (last 3 months)
      const [history] = await connection.promise().query(
        `SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND is_deleted = 0`,
        [user_id]
      );
      const avgSavings = ((history[0].total_income || 0) - (history[0].total_expense || 0)) / 3;
      // Get all goals
      const [goals] = await connection.promise().query(
        `SELECT id, name, target_amount, current_amount, deadline FROM goals WHERE user_id = ?`,
        [user_id]
      );
      // Predict achievement date
      const now = new Date();
      goals.forEach(goal => {
        const remaining = goal.target_amount - goal.current_amount;
        if (avgSavings > 0 && remaining > 0) {
          const months = Math.ceil(remaining / avgSavings);
          const predicted = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
          goal.predicted_achievement = predicted.toISOString().slice(0, 10);
        } else {
          goal.predicted_achievement = null;
        }
      });
      return { code: error_code.SUCCESS, messages: "Goal achievement prediction fetched.", data: goals };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }



  // ...existing code...

  // Analytics: Income vs Expense (per month, last 12 months)
  async getIncomeExpenseAnalytics({ user_id }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT 
          DATE_FORMAT(transaction_date, '%m.%Y') as label,
          SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE user_id = ? AND is_deleted = 0 AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(transaction_date), MONTH(transaction_date)
        ORDER BY YEAR(transaction_date), MONTH(transaction_date)`,
        [user_id]
      );
      // Calculate balance per month
      let balance = 0;
      const labels = [];
      const incomeData = [];
      const expenseData = [];
      const balanceData = [];
      rows.forEach(row => {
        labels.push(row.label);
        incomeData.push(Number(row.income));
        expenseData.push(Number(row.expense));
        balance += Number(row.income) - Number(row.expense);
        balanceData.push(balance);
      });
      return {
        code: error_code.SUCCESS,
        messages: "Income/Expense analytics fetched.",
        data: {
          labels,
          datasets: [
            { type: "bar", label: "Income", data: incomeData, backgroundColor: "#34D399", borderRadius: 6 },
            { type: "bar", label: "Outcome", data: expenseData, backgroundColor: "#F87171", borderRadius: 6 },
            { type: "line", label: "Balance", data: balanceData, borderColor: "#2563EB", backgroundColor: "#2563EB22", tension: 0.4, fill: false, yAxisID: "y1", pointRadius: 4, pointBackgroundColor: "#2563EB" }
          ]
        }
      };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Analytics: Account Balance (per month, last 12 months)
  async getBalanceAnalytics({ user_id }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT 
          DATE_FORMAT(transaction_date, '%m.%Y') as label,
          SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE user_id = ? AND is_deleted = 0 AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(transaction_date), MONTH(transaction_date)
        ORDER BY YEAR(transaction_date), MONTH(transaction_date)`,
        [user_id]
      );
      let balance = 0;
      const labels = [];
      const balanceData = [];
      const incomeData = [];
      rows.forEach(row => {
        labels.push(row.label);
        incomeData.push(Number(row.income));
        balance += Number(row.income) - Number(row.expense);
        balanceData.push(balance);
      });
      return {
        code: error_code.SUCCESS,
        messages: "Balance analytics fetched.",
        data: {
          labels,
          datasets: [
            { label: "Account Balance", data: balanceData, borderColor: "#2563EB", backgroundColor: "#2563EB22", fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#2563EB" },
            { label: "Income", data: incomeData, borderColor: "#34D399", backgroundColor: "#34D39922", fill: false, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#34D399" }
          ]
        }
      };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // Analytics: Spending Trends (per month, last 6 months)
  async getSpendingTrendsAnalytics({ user_id }) {
    try {
      const [rows] = await connection.promise().query(
        `SELECT 
          DATE_FORMAT(transaction_date, '%b') as label,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as spending
        FROM transactions
        WHERE user_id = ? AND is_deleted = 0 AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY YEAR(transaction_date), MONTH(transaction_date)
        ORDER BY YEAR(transaction_date), MONTH(transaction_date)`,
        [user_id]
      );
      const labels = [];
      const spendingData = [];
      rows.forEach(row => {
        labels.push(row.label);
        spendingData.push(Number(row.spending));
      });
      return {
        code: error_code.SUCCESS,
        messages: "Spending trends fetched.",
        data: {
          labels,
          datasets: [
            { label: "Spending", data: spendingData, backgroundColor: "#3B82F6", borderRadius: 6 }
          ]
        }
      };
    } catch (err) {
      return { code: error_code.OPERATION_FAILED, messages: err.message };
    }
  }

  // ...existing code...

  
}

module.exports = new UserModel();
