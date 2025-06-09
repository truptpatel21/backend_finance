const express = require('express');
const router = express.Router();
const UserController = require('../controllers/User');
const middleware = require('../../../middlewares/validators');

// User Authentication
router.post('/api/auth/register', UserController.register);
router.post('/api/auth/login', UserController.login);

router.post('/api/auth/forgot-password', UserController.forgotPassword);
router.post('/api/auth/reset-password', UserController.resetPassword);


router.post('/api/auth/logout', middleware.validateJwtToken, UserController.logout);
router.post('/api/auth/changepassword', middleware.validateJwtToken, UserController.changePassword);

// User Profile
router.post('/api/users/me', middleware.validateJwtToken, UserController.getProfile);
router.post('/api/users/me/update', middleware.validateJwtToken, UserController.updateProfile);

// Admin User Management
router.post('/api/admin/users', [middleware.validateJwtToken, middleware.validateAdmin], UserController.fetchUsers);
router.post('/api/admin/users/update', [middleware.validateJwtToken, middleware.validateAdmin], UserController.updateUserByAdmin);

// Category Management
router.post('/api/category/add', middleware.validateJwtToken, UserController.addCategory);
router.post('/api/category/list', middleware.validateJwtToken, UserController.getCategories);

// Transaction Management
router.post('/api/transaction/add', middleware.validateJwtToken, UserController.addTransaction);
router.post('/api/transaction/list', middleware.validateJwtToken, UserController.getTransactions);

// Budget Management
router.post('/api/budget/set', middleware.validateJwtToken, UserController.setBudget);
router.post('/api/budget/list', middleware.validateJwtToken, UserController.getBudgets);

// Notification Management
router.post('/api/notification/add', middleware.validateJwtToken, UserController.addNotification);
router.post('/api/notification/list', middleware.validateJwtToken, UserController.getNotifications);

// File Uploads
router.post('/api/upload/add', middleware.validateJwtToken, UserController.addUpload);
router.post('/api/upload/list', middleware.validateJwtToken, UserController.getUploads);

// User Settings
router.post('/api/settings/set', middleware.validateJwtToken, UserController.setUserSettings);
router.post('/api/settings/get', middleware.validateJwtToken, UserController.getUserSettings);


// Recurring Transactions
router.post('/api/recurring/add', middleware.validateJwtToken, UserController.addRecurringTransaction);
router.post('/api/recurring/list', middleware.validateJwtToken, UserController.getRecurringTransactions);

// Goals
router.post('/api/goals/add', middleware.validateJwtToken, UserController.addGoal);
router.post('/api/goals/list', middleware.validateJwtToken, UserController.getGoals);

// Tags
router.post('/api/tags/add', middleware.validateJwtToken, UserController.addTag);
router.post('/api/tags/list', middleware.validateJwtToken, UserController.getTags);
router.post('/api/transaction/tag/add', middleware.validateJwtToken, UserController.addTransactionTag);
router.post('/api/transaction/tag/list', middleware.validateJwtToken, UserController.getTransactionTags);

// Shared Budgets
router.post('/api/sharedbudget/add', middleware.validateJwtToken, UserController.addSharedBudget);
router.post('/api/sharedbudget/list', middleware.validateJwtToken, UserController.getSharedBudgets);

// Reports
router.post('/api/reports/add', middleware.validateJwtToken, UserController.addReport);
router.post('/api/reports/list', middleware.validateJwtToken, UserController.getReports);

router.post('/api/summary/monthly', middleware.validateJwtToken, UserController.getMonthlySummary);
router.post('/api/budget/utilization', middleware.validateJwtToken, UserController.getBudgetUtilization);
router.post('/api/recurring/upcoming', middleware.validateJwtToken, UserController.getUpcomingRecurring);
router.post('/api/analytics/top-categories', middleware.validateJwtToken, UserController.getTopSpendingCategories);
router.post('/api/goals/progress', middleware.validateJwtToken, UserController.getGoalProgress);
router.post('/api/cashflow', middleware.validateJwtToken, UserController.getCashFlowForecast);
router.post('/api/spendtrend', middleware.validateJwtToken, UserController.getSpendingTrend);
router.post('/api/categoryspend', middleware.validateJwtToken, UserController.compareCategorySpending);
router.post('/api/predictgoal', middleware.validateJwtToken, UserController.predictGoalAchievement);

router.post('/api/analytics/income-expense', middleware.validateJwtToken, UserController.getIncomeExpenseAnalytics);
router.post('/api/analytics/balance', middleware.validateJwtToken, UserController.getBalanceAnalytics);
router.post('/api/analytics/spending-trends', middleware.validateJwtToken, UserController.getSpendingTrendsAnalytics);



router.post('/api/contact', UserController.contactUs);
router.post('/api/subscribe', middleware.validateJwtToken, UserController.subscribe);
router.post("/api/reports/generate", middleware.validateJwtToken, UserController.generateReport);



router.post('/api/stripe/session', middleware.validateJwtToken, UserController.createStripeSession);
router.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), UserController.stripeWebhook);


module.exports = router;