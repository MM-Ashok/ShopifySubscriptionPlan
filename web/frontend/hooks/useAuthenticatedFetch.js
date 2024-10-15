import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { Redirect } from "@shopify/app-bridge/actions";

export function useAuthenticatedFetch() {
  const app = useAppBridge(); // Ensure app bridge is initialized properly

  return async (url, options = {}) => {
    try {
      // Get the session token
      const token = await getSessionToken(app);

      // Make the request with the session token
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`, // Add the token to the headers
          'Content-Type': 'application/json', // Ensure JSON headers are set
        },
      });

      checkHeadersForReauthorization(response.headers, app);

      return response;
    } catch (error) {
      console.error("Error fetching authenticated request:", error);
      throw error;
    }
  };
}

function checkHeadersForReauthorization(headers, app) {
  if (headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
    const authUrlHeader =
      headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url") || `/api/auth`;

    const redirect = Redirect.create(app);
    redirect.dispatch(
      Redirect.Action.REMOTE,
      authUrlHeader.startsWith("/")
        ? `https://${window.location.host}${authUrlHeader}`
        : authUrlHeader
    );
  }
}
