import React, { useState, useEffect } from "react";

export function TopBar() {
  // State to hold the fetched shop information
  const [storeInfo, setStoreInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const request = await fetch("/api/store/info", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const response = await request.json();
        //console.log(response);
        if (request.ok) {
          setStoreInfo(response.data[0]);
        } else {
          throw new Error(response.error || "Failed to fetch store info");
        }
      } catch (error) {
        console.error("Error fetching store info:", error);
        setError(error.message); // Set error state
      }
    };

    fetchStoreInfo();
  }, []);

  return (
    <div className="topbar-section">
      <div className="logo-block">
        <img className="logo" src="../assets/logo.png" alt="logo image" />
        <h1 className="text-bold h4">Subscription Management</h1>

        {/* Display shop information */}
        {storeInfo ? (
          <div>
              {/* <p>Store Name: {storeInfo.name}</p> */}
              {/* <p>Shop Domain: {storeInfo.domain}</p> Access domain here */}
          </div>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <p>Loading store info...</p>
        )}
      </div>
    </div>
  );
}
