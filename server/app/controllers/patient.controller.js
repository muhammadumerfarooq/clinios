const multer = require("multer");
const moment = require("moment");
const fs = require("fs");
const { validationResult } = require("express-validator");
const { configuration, makeDb } = require("../db/db.js");
const { errorMessage, successMessage, status } = require("../helpers/status");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("req:", req.body);
    const dest = process.env.LAB_UPLOAD_DIR;
    fs.access(dest, function (error) {
      if (error) {
        console.log("Directory does not exist.");
        return fs.mkdir(dest, (err) => cb(err, dest));
      }
      console.log("Directory exists.");
      return cb(null, dest);
    });
  },
  filename: (req, file, cb) => {
    const fileName = `pid${req.body.patient_id}_${file.originalname
      .split(" ")
      .join("-")}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.startsWith("pid")) {
      return cb(new Error("File name should not start with pid"));
    }
    if (file.mimetype === "application/pdf" || file.mimetype === "text/*") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Allowed only .pdf and text"));
    }
  },
});

const getPatient = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select p.firstname, p.middlename, p.lastname, p.gender, p.dob, p.ssn, p.preferred_name, p.referred_by, p.phone_home, p.phone_cell, p.phone_work, p.email, concat(u.firstname, ' ', u.lastname) provider, p.client_id
        , p.admin_note, p.medical_note, p.address, p.address2, p.city, p.postal, p.state, p.emergency_firstname, p.emergency_middlename, p.emergency_lastname, p.emergency_relationship, p.emergency_email,
        p.emergency_phone, p.insurance_name, p.insurance_group, p.insurance_member, p.insurance_phone, p.insurance_desc, p.height, p.waist, p.weight, p.medical_note
        from patient p
        left join user u on u.id=p.user_id
        where p.client_id=${req.client_id}
        and p.id=${patient_id}
      `
    );

    // Call DB query without assigning into a variable
    await db.query(`insert into user_log values (1, 1, now(), 1, null)`);

    const functionalRange = await db.query(
      `select functional_range
        from client
        where id=${req.client_id}`
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }
    const resData = { ...dbResponse[0], functional_range: functionalRange };
    successMessage.data = resData;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const search = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { patient_id } = req.params;
  const { text } = req.body.data;

  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select 'Encounter', id, dt, notes, client_id
        from encounter
        where patient_id=${patient_id}
        and notes like '%${text}%'
        union
        select 'Message', id, created, message, client_id
        from message
        where (patient_id_to=${patient_id} or patient_id_from=${patient_id})
        and message like '%${text}%'
        union
        select 'Admin Note', id, created, admin_note, client_id
        from patient
        where id=${patient_id}
        and admin_note like '%${text}%'
        union
        select 'Medical Note', id, created, medical_note, client_id
        from patient
        where id=${patient_id}
        and medical_note like '%${text}%'
        union
        select 'Lab Note', id, created, note, client_id
        from lab
        where patient_id=${patient_id}
        and note like '%${text}%'
        union
        select 'Lab Assignment Note', id, created, note_assign, client_id
        from lab
        where patient_id=${patient_id}
        and note_assign like '%${text}%'
        order by 1,2,3
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Search not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const history = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select 
            ph.created
            ,concat(u.firstname, ' ', u.lastname) created_user
            ,concat(u2.firstname, ' ', u2.lastname) provider
            ,ph.firstname
            ,ph.middlename
            ,ph.lastname
            ,ph.preferred_name
            ,ph.address
            ,ph.address2
            ,ph.city
            ,ph.state
            ,ph.postal
            ,ph.country
            ,ph.phone_cell
            ,ph.phone_home
            ,ph.phone_work
            ,ph.phone_other
            ,ph.phone_note
            ,ph.email
            ,ph.dob
            ,ph.ssn
            ,ph.gender
            ,ph.emergency_firstname
            ,ph.emergency_middlename
            ,ph.emergency_lastname
            ,ph.emergency_relationship
            ,ph.emergency_email
            ,ph.emergency_phone
            ,ph.insurance_name
            ,ph.insurance_group
            ,ph.insurance_member
            ,ph.insurance_phone
            ,ph.insurance_desc
            ,ph.admin_note
            ,ph.medical_note
            from patient_history ph
            left join user u on u.id=ph.created_user_id
            left join user u2 on u2.id=ph.user_id
            where ph.id=${patient_id}
            order by ph.created desc
            limit 50
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const nextAppointment = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  const now = moment().format("YYYY-MM-DD HH:mm:ss");
  try {
    const dbResponse = await db.query(
      `select 
        min(start_dt) start_dt
        from user_calendar
        where patient_id=${patient_id}
        and start_dt>'${now}'
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const balance = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select 
          sum(t.amount) amount
          from tran t
          where t.patient_id=${patient_id}
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const AdminNotehistory = async (req, res) => {
  const { patient_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select ph.created, ph.admin_note, concat(u.firstname, ' ', u.lastname) name
        from patient_history ph
        left join user u on u.id=ph.created_user_id
        where ph.id=${patient_id}
        and ph.admin_note is not null
        order by ph.created desc
        limit 50
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const adminNoteupdate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { admin_note, old_admin_note } = req.body.data;
  const { patient_id } = req.params;

  const db = makeDb(configuration, res);
  try {
    // Call DB query without assigning into a variable
    await db.query(
      `insert into patient_history (id, admin_note, created, created_user_id) values (${patient_id}, '${old_admin_note}', now(), ${req.user_id})`
    );
    const updateResponse = await db.query(
      `update patient
            set admin_note='${admin_note}'
            where id=${patient_id}
      `
    );

    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getForms = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select pf.form_id, pf.created, cf.title, pf.form
        from patient_form pf
        left join client_form cf on cf.id=pf.form_id
        where pf.patient_id=${patient_id}
        order by pf.created
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Search not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getFormById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { id, patient_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select pf.form_id, pf.created, cf.title, pf.form
        from patient_form pf
        left join client_form cf on cf.id=pf.form_id
        where pf.patient_id=${patient_id} 
        and pf.form_id=${id}
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const handouts = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select ph.created, ph.handout_id, h.filename
        from patient_handout ph
        left join handout h on h.id=ph.handout_id
        where ph.client_id=${req.client_id}
        and ph.patient_id=${patient_id}
        order by h.filename
        limit 100
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const handoutDelete = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { id, patient_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const deleteResponse = await db.query(
      `delete 
        from patient_handout
        where patient_id=${patient_id}
        and handout_id=${id}
      `
    );

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const CreatePatientHandouts = async (req, res) => {
  const { patient_id } = req.params;
  const { handout_id } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const insertResponse = await db.query(
      `insert into patient_handout (patient_id, handout_id, client_id, created, created_user_id) values (${patient_id}, ${handout_id}, ${req.client_id}, now(), ${req.user_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const patientHandouts = async (req, res) => {
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select h.id, h.filename, h.created, concat(u.firstname, ' ', u.lastname) name
        from handout h
        left join patient_handout ph on h.id=ph.handout_id
        left join user u on u.id=ph.created_user_id
        where h.client_id=${req.client_id}
        order by h.filename
        limit 100
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const DeletePatientHandouts = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { patient_id, handout_id } = req.params;
  const db = makeDb(configuration, res);

  try {
    const dbResponse = await db.query(
      `delete
        from patient_handout
        where patient_id=${patient_id}
        and handout_id=${handout_id}
      `
    );

    if (!dbResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Deletion not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getTranType = async (req, res) => {
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select id, name, amount, note, status from tran_type`
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getBilling = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  let { limit } = req.query;
  if (typeof limit === "undefined") {
    limit = 100;
  }
  try {
    const dbResponse = await db.query(
      `select t.dt, t.amount, tt.name tran_type, e.title encounter_title, c.name cpt_procedure, t.note, t.payment_type, pm.account_number
        from tran t
        left join cpt c on c.id=t.cpt_id
        left join encounter e on e.id=t.encounter_id
        left join tran_type tt on tt.id=t.type_id
        left join payment_method pm on pm.id=t.payment_method_id
        where t.patient_id=${patient_id}
        order by t.dt desc
        limit ${limit}
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const createBilling = async (req, res) => {
  const { patient_id } = req.params;
  const { dt, type_id, amount, note } = req.body.data;
  let { payment_type } = req.body.data;

  const db = makeDb(configuration, res);

  if (!payment_type) {
    payment_type = null;
  } else {
    payment_type = `'${payment_type}'`;
  }
  try {
    const insertResponse = await db.query(
      `insert into tran (patient_id, user_id, client_id, dt, type_id, amount, payment_type, note, created, created_user_id) values 
        (${patient_id}, ${req.user_id}, ${req.client_id}, '${dt}', ${type_id}, ${amount}, ${payment_type}, '${note}', now(), ${req.user_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getAllergies = async (req, res) => {
  const { patient_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select pa.created, pa.drug_id, d.name
        from patient_allergy pa
        left join drug d on d.id=pa.drug_id
        where pa.client_id=${req.client_id}
        and pa.patient_id=${patient_id}
        order by d.name
        limit 100
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteAllergy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { patient_id, drug_id } = req.params;
  const db = makeDb(configuration, res);

  try {
    const dbResponse = await db.query(
      `delete from patient_allergy where patient_id=${patient_id} and drug_id=${drug_id}
      `
    );

    if (!dbResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Deletion not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const searchAllergies = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { text } = req.body.data;

  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `select d.id, d.name
        from drug d
        where d.name like '${text}%'
        order by d.name
        limit 50
      `
    );

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Search not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const createPatientAllergy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { patient_id } = req.params;
  const { drug_id } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const insertResponse = await db.query(
      `insert into patient_allergy (patient_id, drug_id, client_id, created, created_user_id) values (${patient_id}, ${drug_id}, ${req.client_id}, now(), ${req.user_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getDocuments = async (req, res) => {
  const db = makeDb(configuration, res);

  const { patient_id } = req.params;
  const { tab } = req.query;

  console.log("tab:", tab);
  console.log('tab == "Imaging"', tab === "Imaging");
  try {
    let $sql;

    $sql = `select l.id, l.created, l.filename, right(l.filename,3) filetype, l.status, l.type, l.lab_dt, l.physician, l.note
      , group_concat(c.name, ': ', c.id, ' ', lc.value, ' ', lc.range_low, ' ', lc.range_high separator ' | ') tests
      from lab l
      left join lab_cpt lc on lc.lab_id=l.id
      left join cpt c on c.id=lc.cpt_id
      where l.patient_id=${patient_id} \n`;
    if (tab === "Labs") {
      $sql += "and l.type='L' and l.deleted=false \n";
    } else if (tab === "Imaging") {
      $sql += "and l.type='I' and l.deleted=false \n";
    } else if (tab === "Misc") {
      $sql += "and l.type='M' and l.deleted=false \n";
    } else if (tab === "Uncategorized") {
      $sql += "and l.type is null and l.deleted=false \n";
    } else if (tab === "Trash") {
      $sql += "and l.deleted=true \n";
    }
    $sql += `group by l.id, l.created, l.filename, right(l.filename,3), l.lab_dt, l.physician, l.note
        order by l.created desc
        limit 200`;

    const dbResponse = await db.query($sql);
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const updateDocuments = async (req, res) => {
  if (!req.body.data) {
    errorMessage.error = "Body content can not be empty";
    return res.status(status.error).send(errorMessage);
  }
  const { id } = req.params;
  const { type } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    let $sql = `update lab set status='${type}'`;
    if (type === "D") {
      $sql += `, deleted_dt='${now}' `;
    } else if (type === "A") {
      $sql += `, deleted_dt=null`;
    }

    $sql += ` where id=${id}`;

    const updateResponse = await db.query($sql);

    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const checkDocument = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select 1
        from lab
        where patient_id=${patient_id}
        and filename=filename
        limit 1`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const documentUpload = upload.single("file");

const removeFile = (file) => {
  fs.unlink(file.path, (err) => {
    if (err) {
      console.error(err);
    }
    console.log(file.path, "removed successfully!");
  });
};

const createDocuments = async (req, res) => {
  documentUpload(req, res, async (err) => {
    if (err) {
      console.log("documentUpload Error:", err.message);
      errorMessage.error = err.message;
      return res.status(status.error).send(errorMessage);
    }
    if (!req.file) {
      errorMessage.error = "File content can not be empty!";
      return res.status(status.error).send(errorMessage);
    }

    const { patient_id } = req.params;
    const uploadedFilename = req.file.originalname;
    const db = makeDb(configuration, res);
    try {
      const existingLabDocument = await db.query(
        `select 1
        from lab
        where patient_id=${patient_id}
        and filename='${uploadedFilename}'
        limit 1`
      );
      if (existingLabDocument.length > 0) {
        removeFile(req.file);
        errorMessage.error = "Same file is already in our database system!";
        return res.status(status.error).send(errorMessage);
      }

      const insertResponse = await db.query(
        `insert into lab (client_id, user_id, patient_id, filename, status, source, created, created_user_id) values (${req.client_id}, ${req.user_id}, ${patient_id}, '${uploadedFilename}', 'R', 'U', now(), ${req.user_id})`
      );

      if (!insertResponse.affectedRows) {
        removeFile(req.file);
        errorMessage.error = "Insert not successful";
        return res.status(status.notfound).send(errorMessage);
      }

      // It's limitation of Multer to pass variable to use as filename.
      // Got this idea from https://stackoverflow.com/a/52794573/1960558
      fs.renameSync(
        req.file.path,
        req.file.path.replace("undefined", patient_id)
      );

      successMessage.data = insertResponse;
      successMessage.message = "Insert successful";
      return res.status(status.created).send(successMessage);
    } catch (excepErr) {
      errorMessage.error = "Insert not successful";
      return res.status(status.error).send(errorMessage);
    } finally {
      await db.close();
    }
  });
};

const getEncounters = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;

  try {
    const dbResponse = await db.query(
      `select e.dt, e.title, et.name encounter_type, concat(u.firstname, ' ', u.lastname) name, notes, treatment
      from encounter e 
      left join encounter_type et on et.id=e.type_id
      left join user u on u.id=e.user_id
      where e.patient_id=${patient_id}
      order by e.dt desc
      limit 50`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const updateEncounter = async (req, res) => {
  const { patient_id, id } = req.params;
  const {
    dt,
    type_id,
    title,
    notes,
    treatment,
    read_dt,
    lab_bill_to,
  } = req.body.data;

  const db = makeDb(configuration, res);
  try {
    let $sql;

    $sql = `update encounter set title='${title}', notes='${notes}', treatment='${treatment}' `;

    if (typeof dt !== "undefined") {
      $sql += `, dt='${moment(dt).format("YYYY-MM-DD HH:mm:ss")}'`;
    }
    if (typeof type_id !== "undefined") {
      $sql += `, type_id=${type_id}`;
    }
    if (typeof read_dt !== "undefined") {
      $sql += `, read_dt='${moment(read_dt).format("YYYY-MM-DD HH:mm:ss")}'`;
    }

    if (typeof lab_bill_to !== "undefined") {
      $sql += `, lab_bill_to=${lab_bill_to}`;
    }

    $sql += `, updated='${moment().format(
      "YYYY-MM-DD HH:mm:ss"
    )}', updated_user_id=${
      req.user_id
    } where patient_id=${patient_id} and id=${id}`;

    const updateResponse = await db.query($sql);
    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};
const deleteEncounter = async (req, res) => {
  const { id } = req.params;

  const db = makeDb(configuration, res);
  try {
    // Call DB query without assigning into a variable
    const deleteResponse = await db.query(`
      delete from encounter where id=${id}
    `);

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteMsgResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getMedicalNotesHistory = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select ph.created, ph.medical_note, concat(u.firstname, ' ', u.lastname) name
        from patient_history ph
        left join user u on u.id=ph.created_user_id
        where ph.id=${patient_id}
        and ph.medical_note is not null
        order by ph.created desc
        limit 50`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const medicalNotesHistoryUpdate = async (req, res) => {
  const { medical_note, old_medical_note } = req.body.data;
  const { patient_id } = req.params;

  const db = makeDb(configuration, res);
  try {
    // Call DB query without assigning into a variable
    await db.query(
      `insert into patient_history (id, medical_note, created, created_user_id) values (${patient_id}, '${old_medical_note}', now(), ${req.user_id})`
    );
    const updateResponse = await db.query(
      `update patient
        set medical_note='${medical_note}'
        where id=${patient_id}
      `
    );

    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getMessages = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  try {
    const dbResponse = await db.query(
      `select m.id, m.created
        , concat(u.firstname, ' ', u.lastname) user_to_from
        , concat(u2.firstname, ' ', u2.lastname) user_to_name
        , m.read_dt, m.subject , m.message
        from message m
        left join user u on u.id=m.user_id_from
        left join user u2 on u2.id=m.user_id_to
        where (patient_id_from=${patient_id} or patient_id_to=${patient_id})
        order by m.created desc
        limit 50`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const createMessage = async (req, res) => {
  const { subject, message, unread_notify_dt } = req.body.data;

  const { patient_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const insertResponse = await db.query(
      `insert into message (subject, message, unread_notify_dt, client_id, user_id_to, user_id_from, created, created_user_id, patient_id_from)
         values ( '${subject}', '${message}', '${unread_notify_dt}', ${req.client_id}, ${patient_id}, ${req.user_id}, now(), ${req.user_id}, ${patient_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.message = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const { id } = req.params;
  const db = makeDb(configuration, res);
  try {
    // Call DB query without assigning into a variable
    await db.query(`
      delete from message_history where message_id=${id}
    `);
    const deleteMsgResponse = await db.query(`
       delete from message where id=${id}
    `);

    if (!deleteMsgResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteMsgResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getAllTests = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;

  try {
    const dbResponse = await db.query(
      `select lc.cpt_id, c.name, date(lc2.lab_dt) lab_dt, lc2.value, lc2.range_high, lc2.range_low, lc2.unit, lc.count from (
        select lc.cpt_id, max(lc2.lab_id) lab_id, count from (
        select cpt_id, max(lab_dt) lab_dt, count(*) count
        from lab_cpt
        where patient_id=${patient_id}
        group by cpt_id
        ) lc
        left join lab_cpt lc2 on lc2.cpt_id=lc.cpt_id and lc2.lab_dt=lc.lab_dt
        group by lc.cpt_id
        ) lc
        left join lab_cpt lc2 on lc2.lab_id=lc.lab_id and lc2.cpt_id=lc.cpt_id
        left join cpt c on c.id=lc2.cpt_id
        order by c.name
        limit 500`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getDiagnoses = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;
  const { active } = req.query;

  try {
    const dbResponse = await db.query(
      `select pi.created, pi.icd_id, i.name
        from patient_icd pi
        left join icd i on i.id=pi.icd_id
        where pi.patient_id=${patient_id}
        and pi.active=${active}
        order by i.name
        limit 50`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const updateDiagnose = async (req, res) => {
  const { patient_id, icd_id } = req.params;
  const { active, is_primary } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    let $sql;

    $sql = `update patient_icd \n`;
    if (typeof active !== "undefined") {
      $sql += `set active=${active} \n`;
    }
    if (typeof is_primary !== "undefined") {
      $sql += `set is_primary=${is_primary} \n`;
    }
    $sql += `where patient_id=${patient_id}
        and icd_id='${icd_id}'`;

    const updateResponse = await db.query($sql);
    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteDiagnose = async (req, res) => {
  const { patient_id, icd_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const deleteResponse = await db.query(`
       delete 
        from patient_icd
        where patient_id=${patient_id}
        and icd_id='${icd_id}'
    `);

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const createDiagnoses = async (req, res) => {
  const { patient_id } = req.params;
  const { icd_id } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const insertResponse = await db.query(
      `insert into patient_icd (patient_id, icd_id, active, client_id, user_id, encounter_id, created, created_user_id)
       values (${patient_id}, '${icd_id}', true, ${req.client_id}, ${req.user_id}, 1, now(), ${req.user_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getMedications = async (req, res) => {
  const db = makeDb(configuration, res);
  const { patient_id } = req.params;

  try {
    const dbResponse = await db.query(
      `select pd.start_dt, d.name, ds.strength, ds.unit, df.descr, pd.expires
        from patient_drug pd
        left join drug d on d.id=pd.drug_id
        left join drug_strength ds on ds.id=pd.drug_strength_id
        left join drug_frequency df on df.id=pd.drug_frequency_id
        where pd.patient_id=${patient_id}
        order by d.name
        limit 50`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteMedications = async (req, res) => {
  const { encounter_id, drug_id, drug_strength_id } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const deleteResponse = await db.query(`
       delete 
        from patient_drug 
        where encounter_id=${encounter_id}
        and drug_id= ${drug_id}
        and drug_strength_id=${drug_strength_id}
    `);

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};
const getRequisitions = async (req, res) => {
  const db = makeDb(configuration, res);
  const { encounter_id } = req.params;

  try {
    const dbResponse = await db.query(
      `select pc.created, c.name cpt_name, c.id, lc.name lab_name
        from patient_cpt pc
        left join cpt c on c.id=pc.cpt_id
        left join lab_company lc on lc.id=c.lab_company_id
        where pc.encounter_id=${encounter_id}
        and pc.completed_dt is null
        order by c.name
        limit 100`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const createRequisitions = async (req, res) => {
  const { patient_id } = req.params;
  const { cpt_id } = req.body.data;
  const db = makeDb(configuration, res);
  try {
    const insertResponse = await db.query(
      `insert into patient_cpt (client_id, patient_id, cpt_id, created, created_user_id) values (${req.client_id}, ${patient_id}, '${cpt_id}', now(), ${req.user_id})`
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteRequisitions = async (req, res) => {
  const { encounter_id, cpt_id } = req.params;
  const db = makeDb(configuration, res);
  try {
    const deleteResponse = await db.query(`
       delete from
        patient_cpt
        where encounter_id=${encounter_id}
        and cpt_id=${cpt_id}
    `);

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = deleteResponse;
    successMessage.message = "Delete successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Delete not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getLayout = async (req, res) => {
  const db = makeDb(configuration, res);
  const { user_id } = req.params;

  try {
    const dbResponse = await db.query(
      `select *
      from user_grid
      where user_id=${user_id}`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "No Layout found";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteLayout = async (req, res) => {
  const db = makeDb(configuration, res);
  const { user_id } = req.params;

  try {
    const dbResponse = await db.query(
      `delete
      from user_grid
      where user_id=${user_id}`
    );
    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Error deleting layout";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const saveLayout = async (req, res) => {
  const { user_id } = req.params;
  const { layout } = req.body;
  const db = makeDb(configuration, res);
  try {
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const insertResponse = await db.query(
      `insert into user_grid
      (
        user_id,
        layout,
        created
      ) values
      (
        ${user_id},
        '${layout}',
        '${now}'
      )
        on duplicate key update 
        layout='${layout}',
        updated='${now}'
      `
    );

    if (!insertResponse.affectedRows) {
      errorMessage.error = "Insert not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = insertResponse;
    successMessage.message = "Insert successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log("err", err);
    errorMessage.error = "Insert not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getDrugs = async (req, res) => {
  const db = makeDb(configuration, res);

  const { query } = req.query;
  let $sql;
  try {
    $sql = `select id, name
    from drug
    where name like '${query}%'
    order by name
    limit 10`;

    const dbResponse = await db.query($sql);

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.error("err:", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const getIcds = async (req, res) => {
  const db = makeDb(configuration, res);

  const { query } = req.query;
  let $sql;
  try {
    $sql = `select id, name
    from icd
    where name like '%${query}%'
    order by name
    limit 10`;

    const dbResponse = await db.query($sql);

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.error("err:", err);
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const appointmentTypes = {
  getPatient,
  search,
  history,
  balance,
  nextAppointment,
  AdminNotehistory,
  adminNoteupdate,
  getForms,
  getFormById,
  handouts,
  handoutDelete,
  CreatePatientHandouts,
  patientHandouts,
  DeletePatientHandouts,
  getTranType,
  getBilling,
  createBilling,
  getAllergies,
  deleteAllergy,
  searchAllergies,
  createPatientAllergy,
  getDocuments,
  updateDocuments,
  checkDocument,
  createDocuments,
  getEncounters,
  updateEncounter,
  deleteEncounter,
  getMedicalNotesHistory,
  medicalNotesHistoryUpdate,
  getMessages,
  createMessage,
  deleteMessage,
  getAllTests,
  getDiagnoses,
  deleteDiagnose,
  updateDiagnose,
  createDiagnoses,
  getMedications,
  deleteMedications,
  createRequisitions,
  getRequisitions,
  deleteRequisitions,
  getLayout,
  saveLayout,
  deleteLayout,
  getDrugs,
  getIcds,
};

module.exports = appointmentTypes;
