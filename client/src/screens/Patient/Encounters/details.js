import React from "react";

import IconButton from "@material-ui/core/IconButton";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import EditIcon from "@material-ui/icons/Edit";
import moment from "moment";
import { useDispatch } from "react-redux";

import { setEncounter } from "../../../store/patient/actions";

const useStyles = makeStyles((theme) => ({
  button: {
    padding: 9
  },
  tableContainer: {
    minWidth: 650
  },
  actions: {
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    border: "none",
    "& button": {
      fontSize: "12px"
    }
  }
}));

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.grey,
    color: theme.palette.grey,
    fontSize: "12px",
    fontWeight: 700
  },
  body: {
    fontSize: 14
  }
}))(TableCell);

const StyledTableRow = withStyles((theme) => ({
  root: {
    fontSize: 14,
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.action.hover
    },
    "& th": {
      fontSize: 12
    },
    "& td": {
      fontSize: 12,
      height: "50px"
    }
  }
}))(TableRow);

const EncountersDetails = (props) => {
  const { data, toggleEncountersDialog } = props;
  const dispatch = useDispatch();
  const classes = useStyles();

  const onItemEdit = (selectedItem) => {
    dispatch(setEncounter(selectedItem));
    toggleEncountersDialog();
  };

  return (
    <TableContainer className={classes.tableContainer}>
      <Table size="small" className={classes.table}>
        <TableHead>
          <TableRow>
            <StyledTableCell>Date</StyledTableCell>
            <StyledTableCell>Name</StyledTableCell>
            <StyledTableCell>Title</StyledTableCell>
            <StyledTableCell>Encounter Type</StyledTableCell>
            <StyledTableCell>Notes</StyledTableCell>
            <StyledTableCell>Payment Plan</StyledTableCell>
            <StyledTableCell align="center">Actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <StyledTableRow key={row.dt}>
              <TableCell component="th" scope="row">
                {moment(row.dt).format("MMM D YYYY")}
              </TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.title}</TableCell>
              <TableCell>{row.encounter_type}</TableCell>
              <TableCell>{row.notes || ""}</TableCell>
              <TableCell>{row.paymentPlan || ""}</TableCell>

              <TableCell className={classes.actions}>
                <IconButton
                  className={classes.button}
                  onClick={() => onItemEdit(row)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EncountersDetails;
