export interface IGenericResponse {
  success: boolean;
  error?: string;
}

export interface IErrorResponse extends IGenericResponse {
  success: false;
  error: string;
}

export interface ISuccessResponse extends IGenericResponse {
  success: true;
  error: undefined;
}

/**
 * Typeguard for error responses
 */
export function isErrorResponse(response: any): response is IErrorResponse {
  return response && response.success === false;
}
