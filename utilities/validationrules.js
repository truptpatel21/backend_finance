const { email } = require("../languages/en");

const rules = {
    
    signup:{
        email : "required|email",
        name : "required|string",
        password : "required|string|min:6",
    },

    login_simple: {
        login_type: "required|string|in:simple,facebook,google,apple",
        loginid: "required",
        password: "required|string",
        // device_token: "required|string",
        // device_type: "required|string",
        // os_version: "required|string",
        // latitude: "required|string",
        // longitude: "required|string",
        // app_version: "required|string"
    },
    login_social: {
        login_type: "required|string|in:simple,facebook,google,apple",
        loginid : "required|email",
        social_id: "required|string",
        device_token: "required|string",
        device_type: "required|string",
        os_version: "required|string",
        latitude: "required|string",
        longitude: "required|string",
        app_version: "required|string"
    },

    signup_simple: {
        login_type: "required|string|in:simple,facebook,google,apple",
        // mobile: "required|numeric",
        name: "required|string",
        address: "required|string",
        // country_code : "required|string",
        email: "required|email",
        // profile_image: "required|string|max:255",
        password: "required|string|min:6",
        // device_token: "required|string",
        // device_type: "required|string",
        // latitude: "required|string",
        // longitude: "required|string",
        // os_version: "required|string",
        // app_version: "required|string"
    },
    signup_social: {
        login_type: "required|string|in:simple,facebook,google,apple",
        social_id: "required|string",
        device_token: "required|string",
        device_type: "required|string",
        latitude: "required|string",
        longitude: "required|string",
        email: "required|email",
        mobile : "required|numeric",
        os_version: "required|string",
        app_version: "required|string"
    },
    
    login:{
        email : "required|email",
        password : "required|string|min:6",
    },

    forgetPasswordwithEmail: {
        email: "required|email"
    },

    pauseTime: {
        task_id : "required|integer",
        time : "required|integer",
    },

    task : {
        name : "required|string",
        desc : "required|string",
        deadline : "required|date",
    },

    changeStatus: {
        task_id : "required|integer",
        status : "required|string|in:in_progress,completed",
    },
    
    blog : {
        title: "required|string",
        content: "required|string",
        tags : "required|string",
    },

    updateBlog : {
        title: "required|string",
        content: "required|string",
        tags : "required|string",
        blog_id : "required|integer",
    },

    deleteBlog : {
        blog_id : "required|integer",
    },

    admin_login: {
        email: "required|email",
        password: "required|string|min:6"
    },
    product_create: {
        name: "required|string",
        price: "required|numeric",
        category: "required|string",
        description: "required|string",
        image_url: "required|string"
    },
    product_update: {
        id: "required|integer",
        name: "required|string",
        price: "required|numeric",
        category: "required|string",
        description: "required|string",
        image_url: "required|string"
    },
    product_delete: {
        product_id: "required|integer"
    }

    
    
    
    
    
};

module.exports = rules;
