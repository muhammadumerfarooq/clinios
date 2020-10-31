const { configuration, makeDb } = require("../db/db.js");
const { errorMessage, successMessage, status } = require("../helpers/status");

const getReportFinanceDetail = async (req, res) => {
  const db = makeDb(configuration, res);
  try {
    const dbResponse = await db.query(`select t.dt, tt.name, t.amount, e.title encounter_title, t.cpt_id, c.name cpt_name, t.note, t.patient_id hyperlink
    , concat(u.firstname, ' ', u.lastname) patient_name, t.created
    from tran t
    left join tran_type tt on tt.id=t.type_id
    left join user u on u.id=t.patient_id
    left join cpt c on c.id=t.cpt_id
    left join encounter e on e.id=t.encounter_id
    where t.client_id=${req.client_id}
    and t.dt>="${req.query.dateFrom}"
    and t.dt<="${req.query.dateTo}"
    order by t.dt desc
    limit 100`);

    if (!dbResponse) {
      errorMessage.error = "None found";
      return res.status(status.notfound).send(errorMessage);
    }
    successMessage.data = dbResponse;
    return res.status(status.created).send(successMessage);
  } catch (error) {
    errorMessage.error = "Select not successful";
    return res.status(status.error).send(errorMessage);
  } finally {
    await db.close();
  }
};

const reportFinanceDetail = {
  getReportFinanceDetail,
};
module.exports = reportFinanceDetail;
