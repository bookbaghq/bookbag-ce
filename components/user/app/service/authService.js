var master = require('mastercontroller');
var crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

class authService {

    _currentUser = null;
    constructor() {

    }

    _generateNumericId(length = 30) {
        const bytes = crypto.randomBytes(length);
        let id = '';
        for (let i = 0; i < bytes.length; i++) {
            id += String(bytes[i] % 10);
        }
        // Ensure exact length
        if (id.length > length) id = id.slice(0, length);
        while (id.length < length) id += '0';
        return id;
    }

    authenticate(email, password, userContext, req) {
        var $that = this;
        var authenticatedUser = this.findAuthByEmail(email, userContext);
        if (authenticatedUser) {
            var saltedHash = bcrypt.hashSync(password, authenticatedUser.Auth.password_salt);
            if (authenticatedUser.Auth.password_hash === saltedHash) {
                return {
                    user: authenticatedUser,
                    isValid: true
                }
            }
            else {
                return {
                    isvalid: false
                };
            }
        } else {
            return {
                isvalid: false
            };
        }
    }

    validateIsAdmin() {
        if (this._currentUser.isAdmin === true) {
            return this.next();
        }
        else {
            return this.returnJson({
                error: "Insufficient Admin Permissions"
            });
        }
    }

    validateIsSubscriber() {
        if (this._currentUser.isSubscriber === true) {
            return this.next();
        }
        else {
            return this.returnJson({
                error: "Insufficient Subscriber Permissions"
            });
        }
    }

    currentUser(req, userContext) {
        try {
            // If sign-in is disabled, use temp user id from cookie or create new
            try {
                const settings = userContext.Settings.take(1).toList()[0];
                const signInEnabled = settings && settings.sign_in_enabled === 0 ? false : true;
                if (!signInEnabled) {
                    let tempUserId = master.sessions.getCookie('temp_user_id', req);
                    if (!tempUserId || tempUserId === -1) {
                        tempUserId = this._generateNumericId(30);
                        // Try to set cookie if a response handle is available
                        try {
                            const resp = (req && req.response) ? req.response
                                : (master.requestList && master.requestList.response) ? master.requestList.response
                                : null;
                            if (resp) {
                                const originHeader = (req && req.headers && req.headers.origin) ? String(req.headers.origin) : '';
                                const isHttps = originHeader.startsWith('https://');
                                // For HTTPS: use sameSite: 'None' with secure: true
                                // For HTTP (dev): omit sameSite to allow cookies across ports on same host
                                const cookieOptions = isHttps
                                    ? { path: '/', httpOnly: true, maxAge: 24 * 60 * 6 * 1000, secure: true, sameSite: 'None' }
                                    : { path: '/', httpOnly: true, maxAge: 24 * 60 * 6 * 1000, secure: false };
                                master.sessions.setCookie('temp_user_id', String(tempUserId), resp, cookieOptions);
                            }
                        } catch (_) {}
                    }
                    const res = {
                        isAuthenticated: true,
                        isAdmin: false,
                        isSubscriber: true,
                        id: String(tempUserId),
                        isTemp: true
                    };
                    this._currentUser = res;
                    return res;
                }
            } catch (_) { /* fall through to normal flow */ }

            // Normal session-based flow
            const ses = master.sessions.getCookie('login', req);
            if (ses === -1) {
                return { error: 'Session not found' };
            }
            const obj = this.findByTempID(ses, userContext);
            const res = {
                isAuthenticated: false,
                isAdmin: false,
                isSubscriber: false,
                id: ''
            };
            if (obj) {
                res.id = String(obj.user.id);
                res.isAuthenticated = true;
                if (obj.user.role === 'Administrator') res.isAdmin = true;
                if (obj.user.role === 'Subscriber') res.isSubscriber = true;
            }
            this._currentUser = res;
            return res;
        } catch (e) {
            return { error: e?.message || 'currentUser error' };
        }
    }


    findByTempID(ses, userContext) {

        var authResults = userContext.Auth.raw(`select * from Auth where temp_access_token = '${ses}'`).toList();
        if (authResults && authResults.length > 0) {
            var auth = authResults[0];
            var user = auth.User;
            if (user === null) {
                return false;
            } else {
                return {
                    user: user,
                    auth: auth
                }
            }
        } else {
            return false;
        }
    }

    accessToken(json) {
        return jwt.sign(json, master.env.jwtAPI.ACCESS_TOKEN_SECRET, { expiresIn: "300s" })
    }

    refreshToken(json) {
        return jwt.sign(json, master.env.jwtAPI.REFRESH_TOKEN_SECRET, { expiresIn: "1d" })
    }


    findUserByID(userContext, auth, req) {
        try {
            var user = userContext.User.raw(`select * from User where id = '${auth.id}'`).single();
            var auth = auth.Auth;
            if (user === null) {
                return false;
            } else {
                // var currentUserVM = {
                //     propertyFilter: { include: ['auth_id', 'id'] }
                //   }
                //var userMapped =  req._mapper.mapObject(user, currentUserVM);

                return {
                    user: {
                        auth_id: user.auth_id,
                        id: user.id
                    },
                    auth: {
                        email: auth.email
                    }
                }
            }
        }
        catch (error) {
            console.log("Error")
        }

    }

    findAuthByEmail(email, context) {
        // Case-insensitive email lookup
        var auth = context.User.raw(`select * from User where lower(email) = lower('${email}')`).single();
        if (auth === null) {
            return false;
        } else {
            return auth;
        }

    };

    findAuthByAuthResetToken(token, context) {

        var auth = context.Auth.raw(`select * from Auth where password_reset_token = '${token}'`).single();
        if (auth === null) {
            return false;
        } else {
            return auth;
        }

    };

    findUserByAuthId(id, context) {

        var auth = context.Auth.raw(`select * from Auth where id = '${id}'`).single();
        var user = auth.User;
        if (user === null) {
            return false;
        } else {
            return user;
        }

    };


    generateRandomKey(hash) {
        var sha = crypto.createHash(hash);
        sha.update(Math.random().toString());
        return sha.digest('hex');
    }

    generateRandomUsername(length = 8) {
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let username = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            username += characters.charAt(randomIndex);
        }
        return username;
    }

    generateUserName(userModel) {
        var proposedName = this.generateRandomUsername(10);
        let username = proposedName.toLowerCase().replace(/\s/g, '');
        let count = 0;
        while (true) {
            const existingUser = userModel.where(r => r.user_name === $$, username).single();
            if (!existingUser) {
                return username;
            }
            count++;
            username = `${proposedName.toLowerCase().replace(/\s/g, '')}${count}`;
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

module.exports = authService;