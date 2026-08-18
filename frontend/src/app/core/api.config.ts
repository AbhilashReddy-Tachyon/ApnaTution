import { environment } from '../../environments/environment';

/**
 * Where the API lives. The value comes from the environment file that the build
 * selects, so a deployment target is changed by editing config rather than
 * source — and a test can override it through `API_BASE_URL` below.
 */
export const API_CONFIG = {
    baseUrl: environment.apiBaseUrl,
};
