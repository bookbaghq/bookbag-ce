class MailLog {

    id(db){ db.integer().primary().auto(); }

    message_id(db){ db.string().nullable(); }

    to_email(db){ db.string().notNullable(); }

    subject(db){ db.string().nullable(); }

    status(db){ db.string().nullable(); } // sent, failed, opened, clicked

    provider(db){ db.string().nullable(); }

    meta(db){ db.string().nullable(); }

    created_at(db){ db.string().notNullable(); db.get(v=> v || Date.now().toString()); }

    updated_at(db){ db.string().notNullable(); db.get(v=> v || Date.now().toString()); }
}

module.exports = MailLog;


