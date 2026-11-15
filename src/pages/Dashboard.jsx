
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import "../styles/dashboard.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUnit, setSelectedUnit] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  // Date filters
  const [dateFilterType, setDateFilterType] = useState("");
const [selectedDate, setSelectedDate] = useState("");
const [selectedMonth, setSelectedMonth] = useState("");
const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  // Convert Firestore date into local YYYY-MM-DD format
  const getLocalDate = (createdAt) => {
    if (!createdAt) return "";

    let date;

    if (typeof createdAt.toDate === "function") {
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      date = new Date(createdAt);
    }

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

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

      const recordDate = getLocalDate(record.createdAt);
      const recordMonth = recordDate
        ? recordDate.slice(0, 7)
        : "";

      // Exact date takes priority over month
      const matchesDate =
  dateFilterType === "date"
    ? recordDate === selectedDate || !selectedDate
    : dateFilterType === "month"
    ? recordMonth === selectedMonth || !selectedMonth
    : true;

      return (
        matchesUnit &&
        matchesDepartment &&
        matchesDate
      );
    });
  }, [
  records,
  selectedUnit,
  selectedDepartment,
  dateFilterType,
  selectedDate,
  selectedMonth,
]);

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
      .sort(
        (a, b) =>
          b.totalHindrances - a.totalHindrances
      );
  }, [filteredRecords]);

  // Reset department if unavailable in selected unit
  useEffect(() => {
    if (
      selectedDepartment !== "All" &&
      !departments.includes(selectedDepartment)
    ) {
      setSelectedDepartment("All");
    }
  }, [departments, selectedDepartment]);

  // Clear date filters
  const clearDateFilters = () => {
    setSelectedDate("");
    setSelectedMonth("");
  };

  // ======================================
// EXPORT DASHBOARD TO PDF
// ======================================
const handleExportPDF = () => {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const currentDate = new Date();

  // Format selected filters
  const unitLabel =
    selectedUnit === "All" ? "All Units" : selectedUnit;

  const departmentLabel =
    selectedDepartment === "All"
      ? "All Departments"
      : selectedDepartment;

  let dateLabel = "All Dates";

  if (dateFilterType === "date") {
    dateLabel = selectedDate
      ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString()
      : "All Dates";
  } else if (dateFilterType === "month") {
    dateLabel = selectedMonth
      ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )
      : "All Dates";
  }

  // ======================================
  // REPORT HEADER
  // ======================================
  pdf.setFillColor(0, 61, 122);
  pdf.rect(0, 0, pageWidth, 38, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);

  pdf.text("HAND HYGIENE COMPLIANCE REPORT", 14, 17);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text("Hand Hygiene Compliance Overview", 14, 25);

  pdf.setFontSize(9);
  pdf.text(
    `Generated: ${currentDate.toLocaleString()}`,
    14,
    32
  );

  // ======================================
  // SELECTED FILTERS
  // ======================================
  let currentY = 48;

  pdf.setTextColor(40, 40, 40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text("REPORT FILTERS", 14, currentY);

  autoTable(pdf, {
    startY: currentY + 5,
    head: [["Filter", "Selected Value"]],
    body: [
      ["Unit", unitLabel],
      ["Department", departmentLabel],
      ["Date", dateLabel],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: [0, 61, 122],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // ======================================
  // COMPLIANCE SUMMARY
  // ======================================
  currentY = pdf.lastAutoTable.finalY + 12;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(40, 40, 40);

  pdf.text("COMPLIANCE SUMMARY", 14, currentY);

  autoTable(pdf, {
    startY: currentY + 5,
    head: [
      [
        "Total Submissions",
        "Total Complied",
        "Complied %",
        "Total Missed",
        "Missed %",
      ],
    ],
    body: [
      [
        totalSubmissions,
        totalComplied,
        `${compliedPercentage}%`,
        totalMissed,
        `${missedPercentage}%`,
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 5,
      halign: "center",
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: [0, 61, 122],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      fontStyle: "bold",
    },
    margin: { left: 14, right: 14 },
  });

  // ======================================
  // MOST COMMON MISSED / HINDRANCES
  // ======================================
  currentY = pdf.lastAutoTable.finalY + 12;

  // Add a new page if there is insufficient space
  if (currentY > pageHeight - 45) {
    pdf.addPage();
    currentY = 20;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(40, 40, 40);

  pdf.text("MOST COMMON MISSED / HINDRANCES", 14, currentY);

  const hindranceRows = [];

  departmentHindrances.forEach((item) => {
    item.reasons.forEach((reason, index) => {
      hindranceRows.push([
        item.department,
        index + 1,
        reason.reason,
        `${reason.count} ${
          reason.count === 1 ? "time" : "times"
        }`,
      ]);
    });
  });

  if (hindranceRows.length === 0) {
    hindranceRows.push([
      "-",
      "-",
      "No missed hindrances recorded for the selected filters.",
      "-",
    ]);
  }

  autoTable(pdf, {
    startY: currentY + 5,
    head: [
      ["Department", "Rank", "Missed Reason / Hindrance", "Frequency"],
    ],
    body: hindranceRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      textColor: [50, 50, 50],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [0, 61, 122],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 28, halign: "center" },
    },
    margin: { left: 14, right: 14 },
  });

  // ======================================
  // REPORT FOOTER / PAGE NUMBERS
  // ======================================
  const totalPages = pdf.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    pdf.setDrawColor(200, 200, 200);
    pdf.line(
      14,
      pageHeight - 15,
      pageWidth - 14,
      pageHeight - 15
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);

    pdf.text(
      "Hand Hygiene Compliance App | Dashboard Report",
      14,
      pageHeight - 9
    );

    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 9,
      { align: "right" }
    );
  }

  // ======================================
  // DOWNLOAD PDF
  // ======================================
  const fileDate = currentDate.toISOString().slice(0, 10);

  pdf.save(`Hand-Hygiene-Compliance-Report-${fileDate}.pdf`);
};

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
  <div className="dashboard-header-title">
    <h1>Dashboard</h1>
    <p>Hand Hygiene Compliance Overview</p>
  </div>

  <button
    type="button"
    className="dashboard-export-btn"
    onClick={handleExportPDF}
    disabled={loading || !!error}
  >
    Export PDF
  </button>
</div>

      {/* MOBILE FILTER TOGGLE */}
<button
  type="button"
  className="dashboard-mobile-filter-toggle"
  onClick={() => setShowMobileFilters(!showMobileFilters)}
  aria-expanded={showMobileFilters}
  aria-controls="dashboardFilters"
>
  <span>
    {showMobileFilters ? "Hide Filters" : "Show Filters"}
  </span>

  <span className="dashboard-filter-toggle-icon">
    {showMobileFilters ? "▲" : "▼"}
  </span>
</button>

{/* FILTERS */}
<div
  id="dashboardFilters"
  className={`dashboard-filters ${
    showMobileFilters ? "mobile-filters-open" : ""
  }`}
>

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

        
{/* DATE FILTER */}
<div className="dashboard-filter-group">
  <label htmlFor="dateFilterType">Date Filter</label>

  <select
    id="dateFilterType"
    value={dateFilterType}
    onChange={(e) => {
      setDateFilterType(e.target.value);
      setSelectedDate("");
      setSelectedMonth("");
    }}
  >
    <option value="">All Dates</option>
    <option value="date">Exact Date</option>
    <option value="month">Exact Month</option>
  </select>
</div>

{/* SHOW EXACT DATE PICKER */}
{dateFilterType === "date" && (
  <div className="dashboard-filter-group">
    <label htmlFor="exactDate">Select Date</label>

    <input
      type="date"
      id="exactDate"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
    />
  </div>
)}

{/* SHOW EXACT MONTH PICKER */}
{dateFilterType === "month" && (
  <div className="dashboard-filter-group">
    <label htmlFor="exactMonth">Select Month</label>

    <input
      type="month"
      id="exactMonth"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
    />
  </div>
)}

{/* CLEAR DATE FILTER */}
{dateFilterType !== "" && (
  <div className="dashboard-filter-group dashboard-clear-filter">
    <label>Reset</label>

    <button
      type="button"
      onClick={() => {
        setDateFilterType("");
        setSelectedDate("");
        setSelectedMonth("");
      }}
    >
      Clear Date Filter
    </button>
  </div>
)}

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
                            {reason.count}{" "}
                            {reason.count === 1 ? "time" : "times"}
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
