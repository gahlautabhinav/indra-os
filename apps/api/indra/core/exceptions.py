from fastapi import status


class IndraException(Exception):
    def __init__(
        self,
        message: str,
        error_code: str = "indra_error",
        domain: str = "indra",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        self.message = message
        self.error_code = error_code
        self.domain = domain
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(IndraException):
    def __init__(self, resource: str, id: str) -> None:
        super().__init__(
            message=f"{resource} '{id}' not found",
            error_code="not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(IndraException):
    def __init__(self) -> None:
        super().__init__(
            message="Authentication required",
            error_code="unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(IndraException):
    def __init__(self, action: str = "perform this action") -> None:
        super().__init__(
            message=f"Insufficient permissions to {action}",
            error_code="forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )
