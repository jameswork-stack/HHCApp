
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUnit, setSelectedUnit] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  // Get compliance records from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "complianceObservations"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRecords(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error fetching dashboard records:", err);
        setError("Unable to load compliance records.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Get unique units
  const units = useMemo(() => {
    return [
      ...new Set(
        records
          .map((record) => record.locationName)
          .filter(Boolean)
      ),
    ].sort();
  }, [records]);

  // Get departments based on selected unit
  const departments = useMemo(() => {
    const filteredRecords =
      selectedUnit === "All"
        ? records
        : records.filter(
            (record) => record.locationName === selectedUnit
          );

    return [
      ...new Set(
        filteredRecords
          .map((record) => record.department)
          .filter(Boolean)
      ),
    ].sort();
  }, [records, selectedUnit]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesUnit =
        selectedUnit === "All" ||
        record.locationName === selectedUnit;

      const matchesDepartment =
        selectedDepartment === "All" ||
        record.department === selectedDepartment;

      return matchesUnit && matchesDepartment;
    });
  }, [records, selectedUnit, selectedDepartment]);

  // Count compliance results
  const totalComplied = filteredRecords.filter(
    (record) => record.complianceDetermination === "Complied"
  ).length;

  const totalMissed = filteredRecords.filter(
    (record) => record.complianceDetermination === "Missed"
  ).length;

  // Total filtered submissions
const totalSubmissions = filteredRecords.length;

// Calculate percentages
const compliedPercentage =
  totalSubmissions > 0
    ? ((totalComplied / totalSubmissions) * 100).toFixed(1)
    : "0.0";

const missedPercentage =
  totalSubmissions > 0
    ? ((totalMissed / totalSubmissions) * 100).toFixed(1)
    : "0.0";

    // Get the most common missed reasons per department

// Get the most common missed reasons per department
const departmentHindrances = useMemo(() => {
  const departmentCounts = {};

  filteredRecords
    .filter(
      (record) => record.complianceDetermination === "Missed"
    )
    .forEach((record) => {
      const department =
        record.department || "Unspecified Department";

      if (!departmentCounts[department]) {
        departmentCounts[department] = {};
      }

      // Count selected missed reasons
      (Array.isArray(record.missedReasons)
        ? record.missedReasons
        : []
      ).forEach((item) => {
        const reason =
          typeof item === "string"
            ? item
            : item.reason || item.category;

        if (reason && String(reason).trim()) {
          const label = String(reason).trim();

          departmentCounts[department][label] =
            (departmentCounts[department][label] || 0) + 1;
        }
      });

      // Count additional Other reason
      if (
        record.otherMissedReason &&
        String(record.otherMissedReason).trim()
      ) {
        const label = `Other: ${String(
          record.otherMissedReason
        ).trim()}`;

        departmentCounts[department][label] =
          (departmentCounts[department][label] || 0) + 1;
      }
    });

  return Object.entries(departmentCounts)
    .map(([department, reasons]) => {
      const sortedReasons = Object.entries(reasons)
        .map(([reason, count]) => ({
          reason,
          count,
        }))
        // Highest reason count first
        .sort((a, b) => b.count - a.count);

      const totalHindrances = sortedReasons.reduce(
        (total, item) => total + item.count,
        0
      );

      return {
        department,
        reasons: sortedReasons.slice(0, 3),
        totalHindrances,
      };
    })
    .filter((item) => item.reasons.length > 0)
    // Department with most hindrances first
    .sort(
      (a, b) =>
        b.totalHindrances - a.totalHindrances
    );
}, [filteredRecords]);


  // Reset department if it is not available in the selected unit
  useEffect(() => {
    if (
      selectedDepartment !== "All" &&
      !departments.includes(selectedDepartment)
    ) {
      setSelectedDepartment("All");
    }
  }, [departments, selectedDepartment]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Hand Hygiene Compliance Overview</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="dashboard-filters">
        <div className="dashboard-filter-group">
          <label htmlFor="unitFilter">Unit</label>
          <select
            id="unitFilter"
            value={selectedUnit}
            onChange={(e) => {
              setSelectedUnit(e.target.value);
              setSelectedDepartment("All");
            }}
          >
            <option value="All">All Units</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div className="dashboard-filter-group">
          <label htmlFor="departmentFilter">Department</label>
          <select
            id="departmentFilter"
            value={selectedDepartment}
            onChange={(e) =>
              setSelectedDepartment(e.target.value)
            }
          >
            <option value="All">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
      </div>

      
{/* SUMMARY CARDS */}
{loading ? (
  <div className="dashboard-message">
    Loading compliance data...
  </div>
) : error ? (
  <div className="dashboard-error">{error}</div>
) : (
  <>
    <div className="dashboard-summary">

      {/* COMPLIED CARD */}
      <div className="dashboard-card complied-card">
        <div className="dashboard-card-icon">✓</div>

        <div className="dashboard-card-content">
          <p>Total Complied</p>
          <h2>{totalComplied}</h2>
          <span>Compliant observations</span>

          <div className="dashboard-percentage">
            <strong>{compliedPercentage}%</strong>
            <span>of total submissions</span>
          </div>
        </div>
      </div>

      {/* MISSED CARD */}
      <div className="dashboard-card missed-card">
        <div className="dashboard-card-icon">✕</div>

        <div className="dashboard-card-content">
          <p>Total Missed</p>
          <h2>{totalMissed}</h2>
          <span>Missed observations</span>

          <div className="dashboard-percentage">
            <strong>{missedPercentage}%</strong>
            <span>of total submissions</span>
          </div>
        </div>
      </div>

    </div>


{/* MOST COMMON HINDRANCES */}
<div className="dashboard-hindrances">

  <div className="dashboard-hindrances-header">
    <div>
      <h2>Most Common Missed / Hindrances</h2>
      <p>Top reported reasons per department</p>
    </div>
  </div>

  {departmentHindrances.length === 0 ? (
    <div className="dashboard-no-hindrances">
      No missed hindrances recorded for the selected filters.
    </div>
  ) : (
    <div className="dashboard-department-list">
      {departmentHindrances.map((item) => (
        <div
          className="dashboard-department-card"
          key={item.department}
        >
          <h3>{item.department}</h3>

          <div className="dashboard-hindrance-list">
            {item.reasons.map((reason, index) => (
              <div
                className="dashboard-hindrance-item"
                key={reason.reason}
              >
                <div className="dashboard-hindrance-info">
                  <span className="dashboard-hindrance-rank">
                    {index + 1}
                  </span>

                  <span className="dashboard-hindrance-name">
                    {reason.reason}
                  </span>
                </div>

                <span className="dashboard-hindrance-count">
                  {reason.count} {reason.count === 1 ? "time" : "times"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )}
</div>


    <div className="dashboard-results-info">
      Total Submissions: <strong>{totalSubmissions}</strong>
      <br />
      Showing results based on selected filters.
    </div>
  </>
)}

    </div>
  );
}
