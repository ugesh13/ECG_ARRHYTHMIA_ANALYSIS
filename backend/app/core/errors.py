"""Application errors. Each carries an HTTP status and a safe, user-facing message."""


class AppError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str = "An internal error occurred."):
        super().__init__(message)
        self.message = message


class InvalidRecordIdError(AppError):
    status_code, code = 400, "invalid_record_id"


class InvalidRangeError(AppError):
    status_code, code = 400, "invalid_range"


class RecordNotFoundError(AppError):
    status_code, code = 404, "record_not_found"


class BeatNotFoundError(AppError):
    status_code, code = 404, "beat_not_found"


class RecordReadError(AppError):
    status_code, code = 422, "record_read_error"


class EmptySignalError(AppError):
    status_code, code = 422, "empty_signal"


class UploadValidationError(AppError):
    status_code, code = 400, "invalid_upload"


class UploadTooLargeError(UploadValidationError):
    status_code, code = 413, "upload_too_large"


class ModelUnavailableError(AppError):
    status_code, code = 503, "model_unavailable"


class AnalysisError(AppError):
    status_code, code = 422, "analysis_error"


class NoAnnotationsError(AnalysisError):
    status_code, code = 422, "no_annotations"

