const UserModel = require('../models/User-model');
const common = require('../../../utilities/common');
const middleware = require('../../../middlewares/validators');
const error_code = require('../../../utilities/request-error-code');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require("fs");
const nodemailer = require('nodemailer');
const { stripe, plans } = require('../../../utilities/stripe');
const connection = require('../../../config/database');


function getPlanOrder(value) {
    if (value === "free") return 0;
    if (value === "pro") return 1;
    if (value === "elite") return 2;
    return -1;
}

async function applyPendingDowngradeIfDue(user_id) {
    // Get pending downgrade info
    const [rows] = await connection.promise().query(
        'SELECT pending_plan, pending_plan_effective FROM users WHERE id = ?', [user_id]
    );
    if (!rows.length) return;

    const { pending_plan, pending_plan_effective } = rows[0];
    if (
        pending_plan === "free" &&
        pending_plan_effective &&
        new Date(pending_plan_effective) <= new Date()
    ) {
        // Apply downgrade
        await connection.promise().query(
            'UPDATE users SET subscription_plan = "free", pending_plan = NULL, pending_plan_effective = NULL WHERE id = ?',
            [user_id]
        );
    }
}

class UserController {

    

    // User Registration
    async register(req, res) {
        try {
            const rules = {
                name: 'required|string|min:2|max:255',
                email: 'required|email',
                password: 'required|string|min:6',
                address: 'string|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.register(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // User Login
    async login(req, res) {
        try {
            const rules = {
                email: 'required|email',
                password: 'required|string'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.login(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Forgot Password - Send Email with Link
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) return middleware.send_response(req, res, 400, { keyword: "Email is required" }, {});

            const response = await UserModel.generateResetToken(email);
            if (response.code === 1) {
                await common.sendResetPasswordMail({
                    to_email: email,
                    user_name: response.data.name,
                    reset_token: response.data.token,
                });
            }

            middleware.send_response(req, res, response.code, { keyword: response.messages }, {});
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Reset Password
    async resetPassword(req, res) {
        try {
            const { token, new_password } = req.body;
            if (!token || !new_password) {
                return middleware.send_response(req, res, 400, { keyword: "Token and new password are required" }, {});
            }

            const response = await UserModel.resetPassword(token, new_password);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, {});
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }


    // User Logout
    async logout(req, res) {
        try {
            const token = req.headers['token'];
            if (!token) {
                return middleware.send_response(
                    req,
                    res,
                    error_code.OPERATION_FAILED,
                    { keyword: "Token is required." },
                    {}
                );
            }
            const response = await UserModel.logout({ token });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data || {});
        } catch (error) {
            middleware.send_response(req, res, error_code.OPERATION_FAILED, { keyword: error.message }, {});
        }
    }

    // Change Password
    async changePassword(req, res) {
        try {
            const rules = {
                old_password: 'required',
                new_password: 'required'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.changePassword({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Get Profile
    async getProfile(req, res) {
        try {
            // await applyPendingDowngradeIfDue(req.user.id); 
            const response = await UserModel.getProfile({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, error_code.OPERATION_FAILED, { keyword: error.message }, {});
        }
    }

    // Update Profile
    async updateProfile(req, res) {
        try {
            const rules = {
                name: 'string|min:2|max:255|nullable',
                address: 'string|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.updateProfile({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Admin: Fetch Users
    async fetchUsers(req, res) {
        try {
            const response = await UserModel.fetchUsers();
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Admin: Update User
    async updateUserByAdmin(req, res) {
        try {
            const rules = {
                user_id: 'required|integer',
                name: 'string|min:2|max:255|nullable',
                email: 'email|nullable',
                role: 'string|in:user,admin|nullable',
                address: 'string|nullable',
                is_active: 'boolean|nullable',
                is_deleted: 'boolean|nullable',
                subscription_plan: 'string|in:free,pro,elite|nullable',
                pending_plan: 'string|in:free,pro,elite|nullable',
                pending_plan_effective: 'date|nullable',
                subscription_expiry: 'date|nullable',
                stripe_customer_id: 'string|nullable',
                stripe_subscription_id: 'string|nullable',

            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.updateUserByAdmin(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Category Management
    async addCategory(req, res) {
        try {
            const rules = {
                name: 'required|string|max:255',
                type: 'required|string|in:income,expense'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.addCategory({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getCategories(req, res) {
        try {
            const response = await UserModel.getCategories({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }


    // Transaction Management
    async addTransaction(req, res) {
        try {
            const rules = {
                category_id: 'required|integer',
                amount: 'required|numeric',
                type: 'required|string|in:income,expense',
                transaction_date: 'required|date',
                note: 'string|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.addTransaction({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getTransactions(req, res) {
        try {
            const response = await UserModel.getTransactions({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Budget Management
    // ...existing code...
    async setBudget(req, res) {
        try {
            const rules = {
                year: 'required|integer',
                month: 'required|integer',
                amount: 'required|numeric',
                alert_threshold: 'numeric|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.setBudget({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    // ...existing code...

    async getBudgets(req, res) {
        try {
            const rules = {
                year: 'required|integer',
                month: 'required|integer'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.getBudgets({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Notification Management
    async addNotification(req, res) {
        try {
            const rules = {
                type: 'required|string|in:reminder,alert,info',
                title: 'required|string',
                message: 'required|nullable',
                related_transaction_id: 'integer|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.addNotification({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getNotifications(req, res) {
        try {
            const response = await UserModel.getNotifications({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // File Uploads
    async addUpload(req, res) {
        try {
            const rules = {
                transaction_id: 'integer|nullable',
                file_path: 'required|string',
                file_type: 'string|nullable',
                original_name: 'string|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.addUpload({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getUploads(req, res) {
        try {
            const response = await UserModel.getUploads({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // User Settings
    async setUserSettings(req, res) {
        try {
            const rules = {
                language: 'string|nullable',
                currency: 'string|nullable',
                notification_email: 'boolean|nullable',
                notification_push: 'boolean|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.setUserSettings({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getUserSettings(req, res) {
        try {
            const response = await UserModel.getUserSettings({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Recurring Transactions
    async addRecurringTransaction(req, res) {
        try {
            const rules = {
                category_id: 'required|integer',
                amount: 'required|numeric',
                frequency: 'required|string|in:daily,weekly,monthly,yearly',
                next_due_date: 'required|date',
                end_date: 'date|nullable'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addRecurringTransaction({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getRecurringTransactions(req, res) {
        try {
            const response = await UserModel.getRecurringTransactions({ user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Goals
    async addGoal(req, res) {
        try {
            const rules = {
                name: 'required|string',
                target_amount: 'required|numeric',
                current_amount: 'numeric|nullable',
                deadline: 'required|date'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addGoal({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getGoals(req, res) {
        try {
            const response = await UserModel.getGoals({ user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Tags
    async addTag(req, res) {
        try {
            const rules = { name: 'required|string' };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addTag({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getTags(req, res) {
        try {
            const response = await UserModel.getTags({ user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async addTransactionTag(req, res) {
        try {
            const rules = { transaction_id: 'required|integer', tag_id: 'required|integer' };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addTransactionTag(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getTransactionTags(req, res) {
        try {
            const rules = { transaction_id: 'required|integer' };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.getTransactionTags(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Shared Budgets
    async addSharedBudget(req, res) {
        try {
            const rules = { budget_id: 'required|integer', shared_with_user_id: 'required|integer' };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addSharedBudget(req.body);
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getSharedBudgets(req, res) {
        try {
            const response = await UserModel.getSharedBudgets({ user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Reports
    async addReport(req, res) {
        try {
            const rules = {
                report_type: 'required|string|in:income,expense,summary,budget',
                start_date: 'required|date',
                end_date: 'required|date',
                file_path: 'required|string'
            };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;
            const response = await UserModel.addReport({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }
    async getReports(req, res) {
        try {
            const response = await UserModel.getReports({ user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }


    async getMonthlySummary(req, res) {
        try {
            const { year, month } = req.body;
            const user_id = req.user.id;
            const response = await UserModel.getMonthlySummary({ user_id, year, month });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getBudgetUtilization(req, res) {
        try {
            const { year, month } = req.body;
            const user_id = req.user.id;
            const response = await UserModel.getBudgetUtilization({ user_id, year, month });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getUpcomingRecurring(req, res) {
        try {
            const { year, month } = req.body;
            const user_id = req.user.id;
            const response = await UserModel.getUpcomingRecurring({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getTopSpendingCategories(req, res) {
        try {
            const { start_date, end_date } = req.body;
            const user_id = req.user.id;
            const response = await UserModel.getTopSpendingCategories({ user_id, start_date, end_date });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getGoalProgress(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getGoalProgress({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getCashFlowForecast(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getCashFlowForecast({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async getSpendingTrend(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getSpendingTrend({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async compareCategorySpending(req, res) {
        try {
            const { start_date1, end_date1, start_date2, end_date2 } = req.body
            const user_id = req.user.id;
            const response = await UserModel.compareCategorySpending({ user_id, start_date1, end_date1, start_date2, end_date2 });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async predictGoalAchievement(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.predictGoalAchievement({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }


    // Analytics: Income vs Expense (per month)
    async getIncomeExpenseAnalytics(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getIncomeExpenseAnalytics({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Analytics: Account Balance (per month)
    async getBalanceAnalytics(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getBalanceAnalytics({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    // Analytics: Spending Trends (per month)
    async getSpendingTrendsAnalytics(req, res) {
        try {
            const user_id = req.user.id;
            const response = await UserModel.getSpendingTrendsAnalytics({ user_id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    async contactUs(req, res) {
        try {
            const { name, email, phone, message } = req.body;
            if (!name || !email || !message) {
                return middleware.send_response(req, res, 400, { keyword: "Name, email, and message are required." }, {});
            }
            const response = await UserModel.addContactMessage({ name, email, phone, message });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, {});
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }


    async generateReport(req, res) {
        try {
            const { user_id } = req.user;
            const { year, month, barChartImg, doughnutChartImg, email, user_name, summary } = req.body;

            // const summary = await UserModel.getMonthlySummary({ user_id, year, month });

            const categories = await UserModel.getTopSpendingCategories({
                user_id,
                start_date: `${year}-${month.toString().padStart(2, "0")}-01`,
                end_date: `${year}-${month.toString().padStart(2, "0")}-31`,
            });

            console.log("Generating PDF report for user:", user_id, "Year:", year, "Month:", month);
            console.log("summary:", summary);
            const pdfBuffer = await common.sendReportMailWithPDF({
                to_email: email,
                year,
                month,
                summary,
                categories,
                barChartImg,
                doughnutChartImg,
                user_name,
            });

            res.setHeader("Content-Disposition", `attachment; filename=Finance_Report_${year}_${month}.pdf`);
            res.setHeader("Content-Type", "application/pdf");
            res.end(pdfBuffer);
        } catch (error) {
            console.error("Error generating PDF report:", error);
            res.status(500).json({ message: "An error occurred while generating the report." });
        }
    }
    

    // Subscription Toggle
    async subscribe(req, res) {
        try {
            const rules = { plan: 'required|string|in:free,pro,elite' };
            let messages = { required: req.language.required };
            if (!middleware.checkValidationRules(req, res, req.body, rules, messages)) return;

            const response = await UserModel.updateSubscription({ ...req.body, user_id: req.user.id });
            middleware.send_response(req, res, response.code, { keyword: response.messages }, response.data);
        } catch (error) {
            middleware.send_response(req, res, 500, { keyword: error.message }, {});
        }
    }

    

    async previewSubscriptionChange(req, res) {
        try {
            const { target_plan } = req.body;
            const user_id = req.user.id;
            const [user] = await connection.promise().query(
                'SELECT subscription_plan, subscription_expiry FROM users WHERE id = ?', [user_id]
            );
            if (!user.length) return res.status(404).json({ message: "User not found." });

            const currentPlan = user[0].subscription_plan || "free";
            const expiry = user[0].subscription_expiry; 

            let action = "subscribe";
            if (currentPlan === target_plan) action = "current";
            else if (getPlanOrder(target_plan) > getPlanOrder(currentPlan)) action = "upgrade";
            else if (getPlanOrder(target_plan) < getPlanOrder(currentPlan)) action = "downgrade";

            let message = "";
            let effectiveDate = new Date();
            if (action === "upgrade") {
                if (currentPlan === "free") {
                    message = "You will be upgraded immediately.";
                } else {
                    message = `Your upgrade will take effect after your current plan expires on ${expiry}.`;
                    effectiveDate = expiry;
                }
            } else if (action === "downgrade") {
                message = `Your downgrade will take effect after your current plan expires on ${expiry}.`;
                effectiveDate = expiry;
            } else if (action === "subscribe") {
                message = "You will be subscribed immediately.";
            } else {
                message = "You are already on this plan.";
            }

            res.json({
                currentPlan,
                expiry,
                targetPlan: target_plan,
                action,
                message,
                effectiveDate,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    async downgradeSubscription(req, res) {
        try {
            const user_id = req.user.id;
            // Get current plan and expiry
            const [userRows] = await connection.promise().query(
                'SELECT subscription_plan, subscription_expiry FROM users WHERE id = ?', [user_id]
            );
            if (!userRows.length) return res.status(404).json({ message: "User not found." });

            const currentPlan = userRows[0].subscription_plan;
            const expiry = userRows[0].subscription_expiry;

            if (currentPlan === "free") {
                return res.json({ code: 1, message: "Already on free plan." });
            }

            // Schedule downgrade
            await connection.promise().query(
                'UPDATE users SET pending_plan = ?, pending_plan_effective = ? WHERE id = ?',
                ["free", expiry, user_id]
            );

            res.json({ code: 1, message: "Downgrade scheduled after current plan expires.", data: { pending_plan: "free", pending_plan_effective: expiry } });
        } catch (err) {
            res.status(500).json({ code: 0, message: err.message });
        }
    }


    async createStripeSession(req, res) {
        try {
            const { plan } = req.body;
            const user_id = req.user.id;
            if (!plans[plan]) return res.status(400).json({ message: "Invalid plan." });

            // Create Stripe customer if not exists
            let [user] = await connection.promise().query('SELECT * FROM users WHERE id = ?', [user_id]);
            user = user[0];
            let customerId = user.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: { user_id }
                });
                await UserModel.setStripeCustomer(user_id, customer.id);
                customerId = customer.id;
            }

            // Create checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                customer: customerId,
                line_items: [{ price: plans[plan], quantity: 1 }],
                success_url: `${process.env.APP_URL}/subscribe/success?plan=${plan}`,
                cancel_url: `${process.env.APP_URL}/subscribe/canceled?plan=${plan}`,
                metadata: { user_id, plan }
            });

            res.json({ url: session.url });
        } catch (err) {
            console.error("Stripe session error:", err);
            res.status(500).json({ message: "Stripe error." });
        }
    }

    


   
    



// async createStripeSession(req, res) {
//     try {
//         const { plan } = req.body;
//         const user_id = req.user.id;
//         if (!plans[plan]) return res.status(400).json({ message: "Invalid plan." });

//         // Create Stripe customer if not exists
//         let [user] = await connection.promise().query('SELECT * FROM users WHERE id = ?', [user_id]);
//         user = user[0];
//         let customerId = user.stripe_customer_id;
//         if (!customerId) {
//             const customer = await stripe.customers.create({
//                 email: user.email,
//                 name: user.name,
//                 metadata: { user_id }
//             });
//             await UserModel.setStripeCustomer(user_id, customer.id);
//             customerId = customer.id;
//         }

//         // Create checkout session
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             mode: 'subscription',
//             customer: customerId,
//             line_items: [{ price: plans[plan], quantity: 1 }],
//             success_url: `${process.env.APP_URL}/dashboard?subscription=success`,
//             cancel_url: `${process.env.APP_URL}/dashboard?subscription=cancel`,
//             metadata: { user_id, plan }
//         });

//         res.json({ url: session.url });
//     } catch (err) {
//         console.error("Stripe session error:", err);
//         res.status(500).json({ message: "Stripe error." });
//     }
// }

// // Stripe webhook endpoint
// async stripeWebhook(req, res) {
//     const sig = req.headers['stripe-signature'];
//     let event;
//     try {
//         event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) {
//         console.error("Webhook signature error:", err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // Handle subscription events
//     if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
//         const subscription = event.data.object;
//         const customerId = subscription.customer;
//         const planId = subscription.items.data[0].price.id;
//         let plan = Object.keys(plans).find(key => plans[key] === planId) || 'free';
//         const user = await UserModel.getUserByStripeCustomer(customerId);
//         if (user) {
//             await UserModel.setStripeSubscription(user.id, subscription.id, plan);
//         }
//     }
//     if (event.type === 'customer.subscription.deleted') {
//         const subscription = event.data.object;
//         const customerId = subscription.customer;
//         const user = await UserModel.getUserByStripeCustomer(customerId);
//         if (user) {
//             await UserModel.setStripeSubscription(user.id, null, 'free');
//         }
//     }

//     res.json({ received: true });
// }

    

  

}



module.exports = new UserController();