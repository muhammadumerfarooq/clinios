"use strict";
const { validationResult } = require("express-validator");
const { configuration, makeDb } = require("../db/db.js");
const { errorMessage, successMessage, status } = require("../helpers/status");

/**
 * @param {object} req
 * @param {object} res
 * @returns {object}
 */
const getAll = async (req, res) => {
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(
      `
      select at.id, at.appointment_type, at.appointment_name_portal, at.length, at.allow_patients_schedule, at.sort_order, at.note, at.active, at.client_id
      , at.created
      , concat(u.firstname, ' ', u.lastname) created_user
      , at.updated
      , concat(u2.firstname, ' ', u2.lastname) updated_user
      from appointment_type at
      left join user u on u.id=at.created_user_id
      left join user u2 on u2.id=at.updated_user_id
      where at.client_id=1  /* TODO should be id of client logged in*/
      order by at.sort_order, at.appointment_type
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
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.error = errors.array();
    return res.status(status.bad).send(errorMessage);
  }
  const db = makeDb(configuration, res);
  let appointment_type = req.body.data;
  appointment_type.created = new Date();

  try {
    const dbResponse = await db.query(
      "insert into appointment_type set ?",
      appointment_type
    );

    if (!dbResponse.insertId) {
      errorMessage.error = "Creation not successful";
      res.status(status.notfound).send(errorMessage);
    }

    successMessage.data = dbResponse;
    successMessage.message = "Creation successful";
    return res.status(status.created).send(successMessage);
  } catch (err) {
    errorMessage.error = "Creation not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.error = errors.array();
    return res.status(status.error).send(errorMessage);
  }

  const db = makeDb(configuration, res);
  let appointment_type = req.body.data;

  appointment_type.updated = new Date();
  appointment_type.updated_user_id = req.params.userId;

  try {
    const updateResponse = await db.query(
      `update appointment_type set ? where id =${req.params.appointmentId}`,
      [appointment_type]
    );

    if (!updateResponse.affectedRows) {
      errorMessage.error = "Update not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = updateResponse;
    successMessage.message = "Update successful";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "Update not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const deleteAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorMessage.error = errors.array();
    return res.status(status.error).send(errorMessage);
  }
  const db = makeDb(configuration, res);
  try {
    const deleteApptResponse = await db.query(
      `delete from appointment_type_user where appointment_type_id=${req.params.id}`
    );
    console.log("deleteApptResponse:", deleteApptResponse);
    const deleteResponse = await db.query(
      `delete from appointment_type where id=${req.params.id}`
    );

    if (!deleteResponse.affectedRows) {
      errorMessage.error = "Deletion not successful";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = deleteResponse;
    successMessage.message = "Deletion successful";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "Deletion not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

/**
 * Get appointment types user
 * @param {object} req
 * @param {object} res
 * @returns {object} response array
 */
const getAppointmentTypesUsers = async (req, res) => {
  const db = makeDb(configuration, res);
  try {
    const userResponse = await db.query(
      "select u.id, concat(u.firstname, ' ', u.lastname) name from user u where u.client_id=1 and u.appointments=true order by name limit 100"
    );
    const apptTypeResponse = await db.query(
      "select at.id, at.appointment_type from appointment_type at where at.client_id=1 order by at.appointment_type limit 100"
    );
    const dbResponse = await db.query(
      "select atu.user_id, atu.appointment_type_id, atu.active, atu.amount from appointment_type_user atu where atu.client_id=1 order by atu.user_id, atu.appointment_type_id limit 100"
    );
    const result = {
      user: userResponse,
      appointment_types: apptTypeResponse,
      data: dbResponse,
    };
    if (!userResponse) {
      errorMessage.error = "No appointment types users found.";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = result;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    // handle the error
    errorMessage.error =
      "Operation was not successful for Appointment types User.";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const appointmentTypes = {
  getAll,
  create,
  update,
  deleteAppointment,
  getAppointmentTypesUsers,
};

module.exports = appointmentTypes;
