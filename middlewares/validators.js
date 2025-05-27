const { default: localizify } = require('localizify');
const { t } = require('localizify');
const en = require('../languages/en');
const ar = require('../languages/ar');
const Validator = require('Validator');
const connection = require('../config/database');
const common = require('../utilities/common');
const jwt = require('jsonwebtoken');



let middleware = {
    bypassMethods: ["login", "signup", "verify", "resend", "about", "forget"],
    

    checkValidationRules: function (req, res, request, rules, message, keywords) {

        console.log("Validation body:", request); // Log the body being validated
        console.log("Validation rules:", rules); // Log the rules being applied

        const v = Validator.make(request, rules, message, keywords);
        if (v.fails()) {
            
            const errors = v.getErrors();
            console.log("Validation errors:", v.getErrors());
            console.log(errors);

            let error = "";
            for (let key in errors) {
                error = errors[key][0];
                break;
            }

            let response_data = {
                code: "0",
                message: error,
            };
            // response_data = common.encrypt(response_data);
            console.log("Response Data", response_data);
            res.status(200).send(response_data);
            return false;
        } else {
            return true;
        }
    },

    send_response: function (req, res, code, message, data) {
        console.log(req.lang);

        this.getMessage(req.lang, message, function (translated_message) {
            console.log(translated_message);

            let response_data = {
                code: code,
                message: translated_message,
                data: data
            };
            // response_data = common.encrypt(response_data);
            // console.log("Response Data", response_data);

            res.status(200).send(response_data);
        });
    },

    getMessage: function (language, message, callback) {
        localizify
            .add('en', en)
            .add('ar', ar)
            .setLocale(language);
        console.log(message);

        let translatedMessage = t(message.keyword);

        if (message.content) {
            Object.keys(message.content).forEach(key => {
                translatedMessage = translatedMessage.replace(`{ ${key} }`, message.content[key]);
            });
        }

        callback(translatedMessage);
    },

    extractHeaderLanguage(req, res, callback) {
        let headerLang = (req.headers['accept-language'] !== undefined && req.headers['accept-language'] !== "")
            ? req.headers['accept-language']
            : 'en';

        req.lang = headerLang;
        req.language = (headerLang === 'en') ? en : ar;

        localizify.add('en', en).add('ar', ar).setLocale(req.lang);

        callback();
    },

    validateApiKey: function (req, res, callback) {
        try {
            let apiKey = req.headers['api-key']?.trim();
            console.log("Received Encrypted API Key:", req.headers['api-key']);

            if (!apiKey || apiKey.length < 24) {
                console.log("API Key is missing.");
                const result = { code: '0', message: req.language.header_key_wrong || "provide api key" };
                return res.status(401).send(result);
            }

            let decryptedApiKey = JSON.parse(common.decryptPlain(apiKey));

            if (!decryptedApiKey || decryptedApiKey !== process.env.API_KEY) {
                console.log("API Key mismatch.");
                const result = { code: '0', message: req.language.header_key_wrong || "Invalid api key" };
                return res.status(401).send(result);
            }

            console.log("API Key is valid.");
            callback();
        } catch (error) {
            console.error("Error in validateApiKey:", error);
            const result = { code: '0', message: "Internal Server Error" };
            return res.status(500).send(result);
        }
    },

    

    validateJwtToken(req, res, next) {

        
        const encryptedToken = req.headers['token'] || req.headers['authorization']?.split(' ')[1]; 
        console.log("Received Encrypted JWT Token:", encryptedToken);
        if (!encryptedToken) {
            return res.status(401).send({ code: '0', message: "Authorization token is required." });
            // return res.status(401).send(common.encrypt({ code: '0', message: "Authorization token is required." }));
        }
        try {
            const decryptedData = JSON.parse(common.decryptPlain(encryptedToken));
            const plainToken = decryptedData.jwt; 
            console.log("Decrypted JWT Token:", plainToken);
            const decoded = jwt.verify(plainToken, process.env.JWT_SECRET);
            console.log("Decoded token payload:", decoded);
            req.user = decoded; 
            req.token = encryptedToken; 
            console.log("User ID:", req.user.id);
            console.log("user token:", req.token);
            next();
        } catch (err) {
            console.log("Token verification error:", err.message);
            return res.status(401).send(common.encrypt({ code: '0', message: "Invalid or expired token." }));
        }
    },

    validateAdmin: function (req, res, next) {
        console.log("User ID:", req.user.id);
        console.log("User Role:", req.user?.role);
        if (!req.user || req.user.role !== 'admin') {
            // return res.status(401).send(common.encrypt({ code: '0', message: "Access denied. Admins only." }));
            return res.status(401).send({ code: '0', message: "Access denied. Admins only." });
        }
        next();
    },

    validateUser: function (req, res, next) {
        console.log("User ID:", req.user.id);
        console.log("User Role:", req.user?.role);
        if (!req.user || req.user.role !== 'user') {
            // return res.status(401).send(common.encrypt({ code: '0', message: "Access denied. Admins only." }));
            return res.status(401).send({ code: '0', message: "Access denied. Users only." });
        }
        next();
    }
};

module.exports = middleware;4