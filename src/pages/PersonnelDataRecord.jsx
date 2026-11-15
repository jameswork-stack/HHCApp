import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import "../styles/personnel.css";

export default function PersonnelDataRecord() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // =====================================
  // LOAD COMPLIANCE SUBMISSIONS
  // =====================================
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "complianceObservations"),
      (snapshot) => {
        const submissions = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        // Latest submissions first
        submissions.sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate().getTime()
            : 0;

          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate().getTime()
            : 0;

          return dateB - dateA;
        });

        setRecords(submissions);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error loading compliance records:", err);
        setError("Unable to load personnel records. Please check your Firestore permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================
  // FORMAT DATE
  // =====================================
  const formatDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================
  // FORMAT DETAILS
  // =====================================
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    if (value?.toDate) {
      return formatDate(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return "None";

      return (
        <ul className="personnel-detail-list">
          {value.map((item, index) => (
            <li key={index}>
              {typeof item === "object" && item !== null
                ? Object.entries(item)
                    .map(([key, val]) => `${key}: ${val ?? "N/A"}`)
                    .join(" | ")
                : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="personnel-nested-details">
          {Object.entries(value).map(([key, val]) => (
            <div key={key}>
              <strong>{key}:</strong> {formatValue(val)}
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  // =====================================
  // REMOVE SUBMISSION
  // =====================================
  const handleRemove = async (record) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove this submission?\n\nPersonnel: ${
        record.personnelName || "Unknown"
      }\nSubmission ID: ${record.id}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(record.id);
      setActiveMenu(null);

      await deleteDoc(
        doc(db, "complianceObservations", record.id)
      );
    } catch (err) {
      console.error("Error removing submission:", err);
      alert(
        "Unable to remove this record. Please check your Firestore permissions."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================
  // DETAIL FIELD LABELS
  // =====================================
  const getFieldLabel = (key) => {
    const labels = {
      observerId: "Observer ID",
      observerName: "Observer Name",
      observerEmail: "Observer Email",
      observerRole: "Observer Role",
      locationId: "Location ID",
      locationName: "Location",
      department: "Department",
      personnelId: "Personnel ID",
      personnelName: "Personnel Observed",
      moments: "Moments of Hygiene",
      complianceDetermination: "Compliance Determination",
      complianceDescription: "Compliance Description",
      missedReasons: "Missed Reasons",
      otherMissedReason: "Other Missed Reason",
      createdAt: "Date Submitted",
    };

    return (
      labels[key] ||
      key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) =>
        letter.toUpperCase()
      )
    );
  };

  return (
    <div className="personnel-page">
      <div className="personnel-header">
        <div>
          <h1>Personnel Data Record</h1>
          <p>View and manage submitted compliance observations.</p>
        </div>

        <div className="personnel-total">
          <span>Total Submissions</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="personnel-error">
          {error}
        </div>
      )}

      {/* RECORD LIST */}
      <div className="personnel-table-container">
        {loading ? (
          <div className="personnel-message">
            Loading personnel records...
          </div>
        ) : records.length === 0 ? (
          <div className="personnel-message">
            <h3>No submissions found</h3>
            <p>Compliance submissions will appear here.</p>
          </div>
        ) : (
          <table className="personnel-table">
            <thead>
              <tr>
                <th>Submission Date</th>
                <th>Submission ID</th>
                <th>Personnel Observed</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
               <tr
  key={record.id}
  className={
    activeMenu === record.id ? "personnel-row-menu-open" : ""
  }
>
  <td data-label="Submission Date" className="submission-date-cell">
    <strong>{formatDate(record.createdAt)}</strong>
  </td>

  <td data-label="Submission ID" className="personnel-id">
    {record.id}
  </td>

  <td data-label="Personnel Observed">
    <strong>{record.personnelName || "N/A"}</strong>
  </td>

  <td data-label="Status">
    <span
      className={`personnel-status ${
        record.complianceDetermination === "Complied"
          ? "status-complied"
          : record.complianceDetermination === "Missed"
          ? "status-missed"
          : "status-unknown"
      }`}
    >
      {record.complianceDetermination || "Unknown"}
    </span>
  </td>
                  <td
                    className="personnel-action-cell"
                    data-label="Action"
                  >
                    <div className="personnel-menu-wrapper">
                      <button
                        type="button"
                        className="personnel-menu-button"
                        onClick={() =>
                          setActiveMenu(
                            activeMenu === record.id ? null : record.id
                          )
                        }
                        aria-label="Submission options"
                        disabled={deletingId === record.id}
                      >
                        <span>⋮</span>
                      </button>

                      {activeMenu === record.id && (
                        <div className="personnel-action-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(record);
                              setActiveMenu(null);
                            }}
                          >
                             View
                          </button>

                          <button
                            type="button"
                            className="personnel-remove-option"
                            onClick={() => handleRemove(record)}
                          >
                             Remove
                          </button>
                        </div>
                      )}

                      {deletingId === record.id && (
                        <span className="personnel-deleting">
                          Removing...
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* VIEW SUBMISSION MODAL */}
{selectedRecord && (
  <div
    className="personnel-modal-overlay"
    onClick={() => setSelectedRecord(null)}
  >
    <div
      className="personnel-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="personnel-modal-header">
        <div>
          <h2>Submission Details</h2>
          <p>Compliance observation information</p>
        </div>

        <button
          type="button"
          className="personnel-modal-close"
          onClick={() => setSelectedRecord(null)}
          aria-label="Close details"
        >
          ×
        </button>
      </div>

      <div className="personnel-modal-body">

        {/* SUBMISSION ID */}
        <div className="personnel-submission-info">
          <span>Submission ID</span>
          <strong>{selectedRecord.id}</strong>
        </div>

        {/* OBSERVER NAME */}
        <div className="personnel-detail-row">
          <div className="personnel-detail-label">
            Observer Name
          </div>
          <div className="personnel-detail-value">
            {selectedRecord.observerName || "N/A"}
          </div>
        </div>

        {/* LOCATION */}
        <div className="personnel-detail-row">
          <div className="personnel-detail-label">
            Location
          </div>
          <div className="personnel-detail-value">
            {selectedRecord.locationName || "N/A"}
          </div>
        </div>

        {/* DEPARTMENT */}
        <div className="personnel-detail-row">
          <div className="personnel-detail-label">
            Department
          </div>
          <div className="personnel-detail-value">
            {selectedRecord.department || "N/A"}
          </div>
        </div>

        {/* PERSONNEL OBSERVED */}
        <div className="personnel-detail-row">
          <div className="personnel-detail-label">
            Personnel Observed
          </div>
          <div className="personnel-detail-value">
            {selectedRecord.personnelName || "N/A"}
          </div>
        </div>

        {/* MOMENTS OF HYGIENE */}
<div className="personnel-detail-row">
  <div className="personnel-detail-label">
    Moments of Hygiene
  </div>

  <div className="personnel-detail-value">
    {selectedRecord.moments?.length > 0 ? (
      <ul className="personnel-detail-list">
        {selectedRecord.moments.map((moment, index) => (
          <li key={index}>
            <strong>{moment.label || "N/A"}</strong>

            {moment.description && (
              <p>{moment.description}</p>
            )}
          </li>
        ))}
      </ul>
    ) : (
      "N/A"
    )}
  </div>
</div>

        {/* SHOW IF COMPLIED */}
        {selectedRecord.complianceDetermination === "Complied" && (
          <div className="personnel-detail-row">
            <div className="personnel-detail-label">
              Compliance Description
            </div>
            <div className="personnel-detail-value">
              {selectedRecord.complianceDescription || "N/A"}
            </div>
          </div>
        )}

        {/* SHOW IF MISSED */}
        {selectedRecord.complianceDetermination === "Missed" && (
          <>
            <div className="personnel-detail-row">
              <div className="personnel-detail-label">
                Missed Reasons
              </div>
              <div className="personnel-detail-value">
                {formatValue(selectedRecord.missedReasons)}
              </div>
            </div>

            {selectedRecord.otherMissedReason && (
              <div className="personnel-detail-row">
                <div className="personnel-detail-label">
                  Other Missed Reason
                </div>
                <div className="personnel-detail-value">
                  {selectedRecord.otherMissedReason}
                </div>
              </div>
            )}
          </>
        )}

        {/* DATE SUBMITTED */}
        <div className="personnel-detail-row">
          <div className="personnel-detail-label">
            Date Submitted
          </div>
          <div className="personnel-detail-value">
            {formatDate(selectedRecord.createdAt)}
          </div>
        </div>

      </div>

      <div className="personnel-modal-footer">
        <button
          type="button"
          onClick={() => setSelectedRecord(null)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}