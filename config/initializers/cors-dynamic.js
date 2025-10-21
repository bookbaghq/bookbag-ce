/**
 * Dynamic CORS configuration that allows ANY origin with credentials
 * This enables cookies to work from any domain/IP without hardcoding
 */

module.exports = {
    /**
     * Dynamic origin function - allows the requesting origin
     * This is required because "origin: *" doesn't work with "credentials: true"
     */
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) {
            return callback(null, true);
        }

        // Log the origin for debugging
        console.log(`🌐 CORS: Allowing origin: ${origin}`);

        // Allow any origin dynamically
        callback(null, origin);
    },

    methods: [
        "GET",
        "HEAD",
        "POST",
        "DELETE",
        "PUT",
        "PATCH",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Cookie"
    ],

    exposeHeaders: [
        "Set-Cookie"
    ],

    credentials: true,
    maxAge: 3600
};
