class MailSettings {

    id(db){ db.integer().primary().auto(); }

    from_name(db){ db.string().nullable(); }

    from_email(db){ db.string().nullable(); }

    return_path_matches_from(db){ db.boolean().default(false); }

    weekly_summary_enabled(db){ db.boolean().default(false); }

    created_at(db){ db.string().notNullable(); db.get(v=> v || Date.now().toString()); }

    updated_at(db){ db.string().notNullable(); db.get(v=> v || Date.now().toString()); }
}

module.exports = MailSettings;


