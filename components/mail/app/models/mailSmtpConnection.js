class MailSmtpConnection {

    id(db){ db.integer().primary().auto(); }

    host(db){ db.string().notNullable(); }

    port(db){ db.integer().notNullable().default(25); }

    secure(db){ db.boolean().default(false); }

    auth_user(db){ db.string().nullable(); }

    auth_pass(db){ db.string().nullable(); }

    is_backup(db){ db.boolean().default(false); }

    is_active(db){ db.boolean().default(true); }

    created_at(db){ db.string().notNullable(); db.get(v=> v || Date.now()); }

    updated_at(db){ db.string().notNullable(); db.get(v=> v || Date.now()); }
}

module.exports = MailSmtpConnection;


