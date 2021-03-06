import EmailService from "../../services/email.service";
import { setError, setSuccess } from "../../store/common/actions";
import {
  EMAIL_PENDING,
  EMAIL_ERROR,
  EMAIL_ALREADY_VERIFIED,
  VERIFICATION_EMAIL_SUCCESS,
  VERIFICATION_EMAIL_FAILED
} from "./types";
// CAll common action creator to set error


export const startEmail = () => {
  return {
    type: EMAIL_PENDING
  };
};

const emailError = (data) => ({
  type: EMAIL_ERROR,
  data
});

const verificationEmailSuccess = (message) => ({
  type: VERIFICATION_EMAIL_SUCCESS,
  data: message
});

const verificationEmailFailed = () => ({
  type: VERIFICATION_EMAIL_FAILED
});

export const emailAlreadyVerified = (message) => {
  return {
    type: EMAIL_ALREADY_VERIFIED,
    data: message
  };
};

export const verificationEmail = (userId, token) => {
  return (dispatch) => {
    dispatch(startEmail());
    EmailService.emailVerify(userId, token).then(
      (response) => {
        dispatch(setSuccess(`${response.data.message}`));
        console.log("EmailService.emailVerify:", response);
        if (response.data.isVerified) {
          dispatch(emailAlreadyVerified(response.data.message));
        }
        dispatch(verificationEmailSuccess(response.data.message));
      },
      (error) => {
        console.log("EmailService emailVerify error:", error);
        const resMessage =
          (error.response &&
            error.response.data &&
            error.response.data.message) ||
          error.message ||
          error.toString();
        dispatch(emailError(resMessage));
        let severity = "error";
        dispatch(
          setError({
            severity: severity,
            message: resMessage
          })
        );
      }
    );
  };
};

export const sendVerificationEmail = (data) => {
  return (dispatch) => {
    EmailService.sendEmailVerification(data).then(
      (response) => {
        dispatch(verificationEmailSuccess());
        console.log("EmailService.sendEmailVerification:", response);
      },
      (error) => {
        console.log("EmailService error:", error);
        dispatch(verificationEmailFailed());
      }
    );
  };
};
