
import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import "../styles/compliance.css";
import { useAuth } from "../context/AuthContext";

export default function Compliance() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [departmentsInput, setDepartmentsInput] = useState([""]);

  const [showRequiredPopup, setShowRequiredPopup] = useState(false);
const [requiredMessage, setRequiredMessage] = useState("");

// LOCATION DROPDOWN AND MANAGEMENT
const [showLocationOptions, setShowLocationOptions] = useState(false);
const [locationMenuId, setLocationMenuId] = useState(null);
const [editingLocationId, setEditingLocationId] = useState(null);
const [locationDeleting, setLocationDeleting] = useState(false);
const [showDepartmentOptions, setShowDepartmentOptions] = useState(false);
const [showPersonnelOptions, setShowPersonnelOptions] = useState(false);
const [departmentMenuId, setDepartmentMenuId] = useState(null);
const [personnelMenuId, setPersonnelMenuId] = useState(null);
const [editingSelection, setEditingSelection] = useState(null);
const [selectionEditName, setSelectionEditName] = useState("");
const [selectionSaving, setSelectionSaving] = useState(false);
const [selectionDeleting, setSelectionDeleting] = useState(false);

const longPressTimer = useRef(null);
const longPressTriggered = useRef(false);

  // =====================================
// PERSONNEL STATES
// =====================================

const [personnel, setPersonnel] = useState([]);
const [selectedPersonnel, setSelectedPersonnel] = useState("");

const [showPersonnelForm, setShowPersonnelForm] = useState(false);
const [staffNamesInput, setStaffNamesInput] = useState([""]);
const [showMomentOptions, setShowMomentOptions] = useState(false);
const [showReviewScreen, setShowReviewScreen] = useState(false);
const [submitting, setSubmitting] = useState(false);

const [personnelSaving, setPersonnelSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedMissedCategories, setExpandedMissedCategories] = useState([]);

  const [complianceDetermination, setComplianceDetermination] = useState("");

const [missedReasons, setMissedReasons] = useState([]);

const [otherMissedReason, setOtherMissedReason] = useState("");

  useEffect(() => {
    if (showReviewScreen) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showReviewScreen]);

  // =====================================
// MOMENT OF HYGIENE
// =====================================

const [selectedMoments, setSelectedMoments] = useState([]);

const [locationMenuPosition, setLocationMenuPosition] = useState({
  top: 0,
  left: 0,
});

const getContextMenuPosition = (element) => {
  const rect = element.getBoundingClientRect();

  const menuWidth = 155;
  const menuHeight = 100;
  const padding = 8;

  let left = rect.right - menuWidth;
  let top = rect.top;

  // Prevent menu from going outside the screen
  left = Math.max(
    padding,
    Math.min(left, window.innerWidth - menuWidth - padding)
  );

  top = Math.max(
    padding,
    Math.min(top, window.innerHeight - menuHeight - padding)
  );

  return { top, left };
};

const openLocationMenu = (e, locationId) => {
  setLocationMenuPosition(getContextMenuPosition(e.currentTarget));
  setLocationMenuId(locationId);
};

const hygieneMoments = [
  {
    id: "moment1",
    label: "Moment 1",
    description: "Before touching the patient",
  },
  {
    id: "moment2",
    label: "Moment 2",
    description: "Before clean/aseptic procedure",
  },
  {
    id: "moment3",
    label: "Moment 3",
    description: "After body fluid exposure risk",
  },
  {
    id: "moment4",
    label: "Moment 4",
    description: "After touching the patient",
  },
  {
    id: "moment5",
    label: "Moment 5",
    description: "After touching patient surroundings",
  },
];

const missedReasonCategories = [
  {
    category: "Availability/Access",
    reasons: [
      "Dispenser empty",
      "Dispenser broken/missing",
      "No sink/water",
      "Product out of stock",
      "Dispenser too far away",
    ],
  },
  {
    category: "Time/Workload",
    reasons: [
      "Patient emergency",
      "High workload/staffing shortage",
      "Moment occurred too quickly",
      "Multiple sequential tasks",
    ],
  },
  {
    category: "Knowledge/Training",
    reasons: [
      "Unaware of the 5 Moments",
      "Unsure when hand hygiene is indicated",
      "Insufficient training",
    ],
  },
  {
    category: "Behavior/Culture",
    reasons: [
      "Forgot in the moment",
      "Normalized non-compliance among peers",
      "Gloves worn as false substitute",
      "Low perceived risk",
    ],
  },
  {
    category: "Skin/Health",
    reasons: [
      "Dermatitis/skin irritation",
      "Allergy to product",
    ],
  },
  {
    category: "Environmental",
    reasons: [
      "Crowded/blocked workspace",
      "Patient isolation constraints",
      "Workflow interruption",
    ],
  },
  {
    category: "System/Policy",
    reasons: [
      "No prompt/reminder system",
      "Unclear unit protocol",
      "Lack of leadership enforcement",
    ],
  },
  {
    category: "Other",
    reasons: ["Other"],
  },
];

const showRequiredMessage = (message) => {
  setRequiredMessage(message);
  setShowRequiredPopup(true);
};

const { currentUser, userRole } = useAuth();

const observerName =
  currentUser?.name ||
  currentUser?.displayName ||
  currentUser?.fullName ||
  currentUser?.email ||
  "Unknown User";

  // =====================================
  // LOAD LOCATIONS FROM FIRESTORE
  // =====================================

  useEffect(() => {
    const locationsRef = collection(db, "locations");

    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const locationList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        locationList.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        setLocations(locationList);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading locations:", err);
        setError("Unable to load locations. Please check your permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================
// LOAD PERSONNEL FROM FIRESTORE
// =====================================

useEffect(() => {
  const personnelRef = collection(db, "personnel");

  const unsubscribe = onSnapshot(
    personnelRef,
    (snapshot) => {
      const personnelList = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      personnelList.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      setPersonnel(personnelList);
    },
    (err) => {
  console.error("Error loading personnel:", err.code, err.message);
  setError(`Unable to load personnel: ${err.message}`);
}
  );

  return () => unsubscribe();
}, []);

  // =====================================
  // SELECTED LOCATION
  // =====================================

  const selectedLocation = locations.find(
    (location) => location.id === selectedLocationId
  );

  const departments = selectedLocation?.departments || [];

  // =====================================
  // HANDLE LOCATION CHANGE
  // =====================================

  const handleLocationChange = (e) => {
  setSelectedLocationId(e.target.value);
  setSelectedDepartment("");
  setSelectedPersonnel("");
  setError("");
  setSuccess("");
};

// =====================================
// SELECT LOCATION
// =====================================

const handleSelectLocation = (locationId) => {
  setSelectedLocationId(locationId);
  setSelectedDepartment("");
  setSelectedPersonnel("");
  setShowLocationOptions(false);
  setShowDepartmentOptions(false);
  setShowPersonnelOptions(false);
  setLocationMenuId(null);
  setDepartmentMenuId(null);
  setPersonnelMenuId(null);
  setError("");
  setSuccess("");
};

// =====================================
// LONG PRESS HANDLING
// =====================================

const handleLocationPointerDown = (e, locationId) => {
  if (userRole !== "admin") return;

  longPressTriggered.current = false;

  clearTimeout(longPressTimer.current);
  const position = getContextMenuPosition(e.currentTarget);

  longPressTimer.current = setTimeout(() => {
    longPressTriggered.current = true;
    setLocationMenuPosition(position);
    setLocationMenuId(locationId);
  }, 550);
};

const handleLocationPointerUp = () => {
  clearTimeout(longPressTimer.current);
};

const handleLocationContextMenu = (e, locationId) => {
  if (userRole !== "admin") return;

  e.preventDefault();
  openLocationMenu(e, locationId);
};

const handleSelectionPointerDown = (e, setMenuId, itemId) => {
  if (userRole !== "admin") return;

  longPressTriggered.current = false;
  clearTimeout(longPressTimer.current);
  const position = getContextMenuPosition(e.currentTarget);

  longPressTimer.current = setTimeout(() => {
    longPressTriggered.current = true;
    setLocationMenuPosition(position);
    setMenuId(itemId);
  }, 550);
};

const handleSelectionContextMenu = (e, setMenuId, itemId) => {
  if (userRole !== "admin") return;

  e.preventDefault();
  setLocationMenuPosition(getContextMenuPosition(e.currentTarget));
  setMenuId(itemId);
};

const handleEditSelection = (type, item, itemIndex) => {
  setEditingSelection(
    type === "department"
      ? {
          type,
          locationId: selectedLocationId,
          departmentIndex: itemIndex,
          originalName: item,
        }
      : { type, id: item.id, originalName: item.name || "" }
  );
  setSelectionEditName(type === "department" ? item : item.name || "");
  setLocationMenuId(null);
  setDepartmentMenuId(null);
  setPersonnelMenuId(null);
  setShowLocationOptions(false);
  setShowDepartmentOptions(false);
  setShowPersonnelOptions(false);
  setError("");
  setSuccess("");
};

const handleSaveSelectionEdit = async (e) => {
  e.preventDefault();
  if (!editingSelection) return;

  const cleanName = selectionEditName.trim();
  if (!cleanName) {
    setError(`Please enter a ${editingSelection.type} name.`);
    return;
  }

  if (editingSelection.type === "department") {
    const duplicateDepartment = departments.some(
      (department, index) =>
        index !== editingSelection.departmentIndex &&
        department.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateDepartment) {
      setError("This department already exists in this location.");
      return;
    }
  } else {
    const duplicatePersonnel = personnel.some(
      (person) =>
        person.id !== editingSelection.id &&
        (person.name || "").trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicatePersonnel) {
      setError("This personnel name already exists.");
      return;
    }
  }

  setSelectionSaving(true);
  setError("");
  setSuccess("");

  try {
    if (editingSelection.type === "department") {
      const updatedDepartments = [...departments];
      updatedDepartments[editingSelection.departmentIndex] = cleanName;
      await updateDoc(doc(db, "locations", editingSelection.locationId), {
        departments: updatedDepartments,
        updatedAt: serverTimestamp(),
      });

      if (selectedDepartment === editingSelection.originalName) {
        setSelectedDepartment(cleanName);
      }
      setSuccess("Department updated successfully.");
    } else {
      await updateDoc(doc(db, "personnel", editingSelection.id), {
        name: cleanName,
        updatedAt: serverTimestamp(),
      });
      setSuccess("Personnel updated successfully.");
    }

    setEditingSelection(null);
    setSelectionEditName("");
  } catch (err) {
    console.error(`Error updating ${editingSelection.type}:`, err);
    setError(`Unable to update ${editingSelection.type}. Please check your Firestore permissions.`);
  } finally {
    setSelectionSaving(false);
  }
};

const handleRemoveDepartment = async (department, index) => {
  if (userRole !== "admin") return;
  const confirmed = window.confirm(
    `Are you sure you want to remove "${department}" from this location?`
  );
  if (!confirmed) return;

  setSelectionDeleting(true);
  setDepartmentMenuId(null);
  setError("");
  setSuccess("");
  try {
    const updatedDepartments = departments.filter((_, departmentIndex) => departmentIndex !== index);
    await updateDoc(doc(db, "locations", selectedLocationId), {
      departments: updatedDepartments,
      updatedAt: serverTimestamp(),
    });
    if (selectedDepartment === department) {
      setSelectedDepartment("");
      setSelectedPersonnel("");
    }
    setSuccess(`${department} was removed successfully.`);
  } catch (err) {
    console.error("Error removing department:", err);
    setError("Unable to remove department. Please check your Firestore permissions.");
  } finally {
    setSelectionDeleting(false);
  }
};

const handleRemovePersonnel = async (person) => {
  if (userRole !== "admin") return;
  const confirmed = window.confirm(
    `Are you sure you want to remove "${person.name}" from the personnel list?`
  );
  if (!confirmed) return;

  setSelectionDeleting(true);
  setPersonnelMenuId(null);
  setError("");
  setSuccess("");
  try {
    await deleteDoc(doc(db, "personnel", person.id));
    if (selectedPersonnel === person.id) {
      setSelectedPersonnel("");
    }
    setSuccess(`${person.name} was removed successfully.`);
  } catch (err) {
    console.error("Error removing personnel:", err);
    setError("Unable to remove personnel. Please check your Firestore permissions.");
  } finally {
    setSelectionDeleting(false);
  }
};

const handleCloseSelectionEdit = () => {
  if (selectionSaving) return;
  setEditingSelection(null);
  setSelectionEditName("");
  setError("");
};

// =====================================
// OPEN EDIT LOCATION
// =====================================

const handleEditLocation = (location) => {
  setEditingLocationId(location.id);
  setLocationName(location.name || "");
  setDepartmentsInput(
    location.departments?.length
      ? [...location.departments]
      : [""]
  );

  setLocationMenuId(null);
  setShowLocationOptions(false);
  setError("");
  setSuccess("");
};

// =====================================
// UPDATE LOCATION
// =====================================

const handleUpdateLocation = async (e) => {
  e.preventDefault();

  if (!editingLocationId) return;

  const cleanLocationName = locationName.trim();

  const cleanDepartments = [
    ...new Set(
      departmentsInput
        .map((department) => department.trim())
        .filter(Boolean)
    ),
  ];

  if (!cleanLocationName) {
    setError("Please enter a location name.");
    return;
  }

  if (cleanDepartments.length === 0) {
    setError("Please add at least one department.");
    return;
  }

  const duplicateLocation = locations.some(
    (location) =>
      location.id !== editingLocationId &&
      (location.name || "").trim().toLowerCase() ===
        cleanLocationName.toLowerCase()
  );

  if (duplicateLocation) {
    setError("This location name already exists.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    await updateDoc(doc(db, "locations", editingLocationId), {
      name: cleanLocationName,
      departments: cleanDepartments,
      updatedAt: serverTimestamp(),
    });

    // Keep the selected department only if it still exists
    if (
      selectedLocationId === editingLocationId &&
      !cleanDepartments.includes(selectedDepartment)
    ) {
      setSelectedDepartment("");
      setSelectedPersonnel("");
    }

    setSuccess("Location and departments updated successfully.");

    setEditingLocationId(null);
    setLocationName("");
    setDepartmentsInput([""]);

  } catch (err) {
    console.error("Error updating location:", err);
    setError("Unable to update location. Please check your Firestore permissions.");
  } finally {
    setSaving(false);
  }
};

// =====================================
// DELETE LOCATION
// =====================================

const handleDeleteLocation = async (location) => {
  if (userRole !== "admin") return;

  const confirmed = window.confirm(
    `Are you sure you want to remove "${location.name}" and all its departments? This action cannot be undone.`
  );

  if (!confirmed) return;

  setLocationDeleting(true);
  setError("");
  setSuccess("");
  setLocationMenuId(null);

  try {
    await deleteDoc(doc(db, "locations", location.id));

    if (selectedLocationId === location.id) {
      setSelectedLocationId("");
      setSelectedDepartment("");
      setSelectedPersonnel("");
    }

    setSuccess(`${location.name} was removed successfully.`);
  } catch (err) {
    console.error("Error deleting location:", err);
    setError("Unable to remove location. Please check your Firestore permissions.");
  } finally {
    setLocationDeleting(false);
  }
};

// =====================================
// CLOSE EDIT LOCATION
// =====================================

const handleCloseEditLocation = () => {
  if (saving) return;

  setEditingLocationId(null);
  setLocationName("");
  setDepartmentsInput([""]);
  setError("");
};

  // =====================================
  // ADD LOCATION / DEPARTMENT
  // =====================================

const handleSaveLocation = async (e) => {
  e.preventDefault();

  const cleanLocationName = locationName.trim();

  const cleanDepartments = [
    ...new Set(
      departmentsInput
        .map((department) => department.trim())
        .filter((department) => department !== "")
        .map((department) => department)
    ),
  ];

  if (!cleanLocationName) {
    setError("Please enter a location name.");
    return;
  }

  if (cleanDepartments.length === 0) {
    setError("Please add at least one department.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const existingLocation = locations.find(
      (location) =>
        (location.name || "").trim().toLowerCase() ===
        cleanLocationName.toLowerCase()
    );

    let locationId;

    if (existingLocation) {
      locationId = existingLocation.id;

      const existingDepartments = existingLocation.departments || [];

      const duplicateDepartments = cleanDepartments.filter(
        (department) =>
          existingDepartments.some(
            (existing) =>
              existing.trim().toLowerCase() ===
              department.toLowerCase()
          )
      );

      const newDepartments = cleanDepartments.filter(
        (department) =>
          !existingDepartments.some(
            (existing) =>
              existing.trim().toLowerCase() ===
              department.toLowerCase()
          )
      );

      if (newDepartments.length === 0) {
        setError("All entered departments already exist in this location.");
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, "locations", locationId), {
        departments: arrayUnion(...newDepartments),
      });

      setSuccess(
        `${newDepartments.length} department(s) added successfully.`
      );
    } else {
      const newLocation = await addDoc(
        collection(db, "locations"),
        {
          name: cleanLocationName,
          departments: cleanDepartments,
          createdAt: serverTimestamp(),
        }
      );

      locationId = newLocation.id;

      setSuccess("Location and departments added successfully.");
    }

    setSelectedLocationId(locationId);
    setSelectedDepartment("");

    setLocationName("");
    setDepartmentsInput([""]);
    setShowAddForm(false);
  } catch (err) {
    console.error("Error saving location:", err);
    setError("Unable to save. Please check your Firestore permissions.");
  } finally {
    setSaving(false);
  }
};

// =====================================
// ADD / REMOVE DEPARTMENT INPUT FIELDS
// =====================================

const handleAddDepartmentField = () => {
  setDepartmentsInput((prev) => [...prev, ""]);
};

const handleDepartmentInputChange = (index, value) => {
  setDepartmentsInput((prev) =>
    prev.map((department, i) =>
      i === index ? value : department
    )
  );
};

const handleRemoveDepartmentField = (index) => {
  setDepartmentsInput((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

// =====================================
// ALL PERSONNEL
// =====================================

const filteredPersonnel = personnel;

// =====================================
// ADD / REMOVE STAFF INPUT FIELDS
// =====================================

const handleAddStaffField = () => {
  setStaffNamesInput((prev) => [...prev, ""]);
};

const handleStaffNameChange = (index, value) => {
  setStaffNamesInput((prev) =>
    prev.map((name, i) => (i === index ? value : name))
  );
};

const handleRemoveStaffField = (index) => {
  setStaffNamesInput((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

// =====================================
// SAVE PERSONNEL
// =====================================

const handleSavePersonnel = async (e) => {
  e.preventDefault();

  const cleanStaffNames = [
    ...new Set(
      staffNamesInput
        .map((name) => name.trim())
        .filter((name) => name !== "")
    ),
  ];

  if (cleanStaffNames.length === 0) {
    setError("Please enter at least one staff name.");
    return;
  }

  // Prevent duplicate personnel names
  const duplicateNames = cleanStaffNames.filter((name) =>
    personnel.some(
      (person) =>
        (person.name || "").trim().toLowerCase() ===
        name.toLowerCase()
    )
  );

  if (duplicateNames.length > 0) {
    setError(
      `These personnel already exist: ${duplicateNames.join(", ")}`
    );
    return;
  }

  setPersonnelSaving(true);
  setError("");
  setSuccess("");

  try {
    const personnelCollection = collection(db, "personnel");

    await Promise.all(
      cleanStaffNames.map((name) =>
        addDoc(personnelCollection, {
          name,
          createdAt: serverTimestamp(),
        })
      )
    );

    setSuccess(
      `${cleanStaffNames.length} personnel added successfully.`
    );

    setSelectedPersonnel("");

    setShowPersonnelForm(false);
    setStaffNamesInput([""]);

  } catch (err) {
    console.error("Error saving personnel:", err);

    setError(
      "Unable to save personnel. Please check your Firestore permissions."
    );

  } finally {
    setPersonnelSaving(false);
  }
};

// =====================================
// HANDLE MOMENT CHECKBOXES
// =====================================

const handleMomentChange = (momentId) => {
  setSelectedMoments((prev) =>
    prev.includes(momentId)
      ? prev.filter((id) => id !== momentId)
      : [...prev, momentId]
  );
};

const handleMissedReasonChange = (reason) => {
  setMissedReasons((prev) =>
    prev.includes(reason)
      ? prev.filter((item) => item !== reason)
      : [...prev, reason]
  );

  if (reason === "Other" && missedReasons.includes("Other")) {
    setOtherMissedReason("");
  }
};

const handleDeterminationChange = (value) => {
  setComplianceDetermination(value);
  setMissedReasons([]);
  setOtherMissedReason("");
  setExpandedMissedCategories([]);
};

// =====================================
// HANDLE MISSED CATEGORY DROPDOWN
// =====================================

const handleMissedCategoryToggle = (category) => {
  setExpandedMissedCategories((prev) =>
    prev.includes(category)
      ? prev.filter((item) => item !== category)
      : [...prev, category]
  );
};

// =====================================
// REVIEW OBSERVATION
// =====================================

const handleOpenReview = () => {
  setError("");

  if (!selectedLocationId) {
  showRequiredMessage("Please select a location.");
  return;
}

if (!selectedDepartment) {
  showRequiredMessage("Please select a department.");
  return;
}

if (!selectedPersonnel) {
  showRequiredMessage("Please select personnel observed.");
  return;
}

if (selectedMoments.length === 0) {
  showRequiredMessage("Please select at least one Moment of Hygiene.");
  return;
}

if (!complianceDetermination) {
  showRequiredMessage("Please select a compliance determination.");
  return;
}

if (
  complianceDetermination === "Missed" &&
  missedReasons.length === 0
) {
  showRequiredMessage("Please select at least one reason for missed hand hygiene.");
  return;
}

if (
  complianceDetermination === "Missed" &&
  missedReasons.includes("Other") &&
  !otherMissedReason.trim()
) {
  showRequiredMessage("Please specify the other reason.");
  return;
}

setShowReviewScreen(true);
};

// =====================================
// SUBMIT OBSERVATION TO FIRESTORE
// =====================================


const handleSubmitObservation = async () => {
  setSubmitting(true);
  setError("");
  setSuccess("");

  try {
    const selectedPersonnelRecord = personnel.find(
      (person) => person.id === selectedPersonnel
    );

    const selectedMomentDetails = hygieneMoments
      .filter((moment) => selectedMoments.includes(moment.id))
      .map((moment) => ({
        id: moment.id,
        label: moment.label,
        description: moment.description,
      }));

    const selectedMissedReasons =
      complianceDetermination === "Missed"
        ? missedReasons.map((reason) => {
            const category = missedReasonCategories.find((group) =>
              group.reasons.includes(reason)
            );

            return {
              category: category?.category || "Other",
              reason,
            };
          })
        : [];

    const observationData = {
      observerId: currentUser?.uid || "",
      observerName,
      observerEmail: currentUser?.email || "",
      observerRole: userRole || "",

      locationId: selectedLocationId,
      locationName: selectedLocation?.name || "",
      department: selectedDepartment,

      personnelId: selectedPersonnel,
      personnelName: selectedPersonnelRecord?.name || "",

      moments: selectedMomentDetails,

      complianceDetermination,

      complianceDescription:
        complianceDetermination === "Complied"
          ? "Hand hygiene was performed using alcohol-based hand rub or soap and water."
          : "",

      missedReasons: selectedMissedReasons,

      otherMissedReason:
        complianceDetermination === "Missed" &&
        missedReasons.includes("Other")
          ? otherMissedReason.trim()
          : "",

      // Local timestamp is immediately available offline
      createdAt: Timestamp.now(),
    };

    // Generate a unique Firestore document ID immediately
    const observationRef = doc(
      collection(db, "complianceObservations")
    );

    // Queue the write in Firestore's persistent local cache
    const savePromise = setDoc(observationRef, observationData);

    // Reset the form immediately instead of waiting for the server
    setSelectedLocationId("");
    setSelectedDepartment("");
    setSelectedPersonnel("");
    setSelectedMoments([]);

    setComplianceDetermination("");
    setMissedReasons([]);
    setOtherMissedReason("");

    setExpandedMissedCategories([]);
    setShowMomentOptions(false);
    setShowReviewScreen(false);

    setSuccess(
      navigator.onLine
        ? "Observation saved locally. Synchronizing with Firebase..."
        : "Observation saved on this device. It will synchronize when internet returns."
    );

    // This promise resolves after Firestore receives server confirmation.
    // It can remain pending while the device is offline.
    savePromise
      .then(() => {
        setSuccess("Compliance observation synchronized successfully!");
      })
      .catch((err) => {
        console.error("Error synchronizing observation:", err);
        setError(
          "The observation could not be synchronized. Please check your account permissions and connection."
        );
      });

  } catch (err) {
    console.error("Error saving observation:", err);

    setError(
      "Unable to save the observation. Please try again."
    );
  } finally {
    setSubmitting(false);
  }
};

// =====================================
// CLOSE PERSONNEL FORM
// =====================================

const handleClosePersonnelForm = () => {
  if (personnelSaving) return;

  setShowPersonnelForm(false);
  setStaffNamesInput([""]);
  setError("");
};


  // =====================================
  // CLOSE FORM
  // =====================================

  const handleCloseForm = () => {
  if (saving) return;

  setShowAddForm(false);
  setLocationName("");
  setDepartmentsInput([""]);
  setError("");
};

// =====================================
// REVIEW SCREEN
// =====================================

if (showReviewScreen) {
  const reviewPersonnel = personnel.find(
    (person) => person.id === selectedPersonnel
  );

  const reviewMoments = hygieneMoments.filter(
    (moment) => selectedMoments.includes(moment.id)
  );

  return (
    <div className="compliance-page">

      <div className="compliance-header">
        <div>
          <h1>Review Observation</h1>
          <p>
            Please review all information before submitting.
          </p>
        </div>
      </div>

      {error && (
        <div className="compliance-error">
          {error}
        </div>
      )}


      <div className="review-observation-card">

        {/* LOCATION INFORMATION */}
        <div className="review-section">

          <h3>Observation Information</h3>

          <div className="review-information-grid">

            {/* OBSERVER */}
  <div className="review-information-item">
    <span>Observer Name</span>
    <strong>{observerName}</strong>
  </div>

            <div className="review-information-item">
              <span>Location</span>
              <strong>{selectedLocation?.name || "N/A"}</strong>
            </div>

            <div className="review-information-item">
              <span>Department</span>
              <strong>{selectedDepartment || "N/A"}</strong>
            </div>

            <div className="review-information-item">
              <span>Personnel Observed</span>
              <strong>{reviewPersonnel?.name || "N/A"}</strong>
            </div>

          </div>

        </div>

        <div className="review-divider" />

        {/* MOMENT OF HYGIENE */}
        <div className="review-section">

          <h3>Moment of Hygiene</h3>

          <div className="review-selected-list">

            {reviewMoments.map((moment) => (
              <div
                className="review-selected-item"
                key={moment.id}
              >
                <span className="review-check-icon">✓</span>

                <div>
                  <strong>{moment.label}</strong>
                  <p>{moment.description}</p>
                </div>
              </div>
            ))}

          </div>

        </div>

        <div className="review-divider" />

        {/* COMPLIANCE DETERMINATION */}
        <div className="review-section">

          <h3>Compliance Determination</h3>

          <div className={`review-determination ${
            complianceDetermination === "Complied"
              ? "review-complied"
              : "review-missed"
          }`}>
            {complianceDetermination === "Complied"
              ? "✓ Complied"
              : "✕ Missed"}
          </div>

          {complianceDetermination === "Complied" && (
            <div className="review-description">
              <strong>Hand Hygiene Performed</strong>
              <p>
                Hand hygiene was performed using alcohol-based
                hand rub or soap and water.
              </p>
            </div>
          )}

          {/* MISSED REASONS */}
          {complianceDetermination === "Missed" && (
            <div className="review-missed-list">

              <h4>
                What hindered or contributed to the missed
                hand hygiene opportunity?
              </h4>

              {missedReasonCategories.map((group) => {
                const selectedGroupReasons = group.reasons.filter(
                  (reason) => missedReasons.includes(reason)
                );

                if (selectedGroupReasons.length === 0) {
                  return null;
                }

                return (
                  <div
                    className="review-reason-category"
                    key={group.category}
                  >

                    <strong>{group.category}</strong>

                    <ul>
                      {selectedGroupReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>

                  </div>
                );
              })}

              {missedReasons.includes("Other") && (
                <div className="review-other-reason">
                  <strong>Other Explanation</strong>
                  <p>{otherMissedReason}</p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* REVIEW ACTIONS */}
        <div className="review-actions">

          <button
            type="button"
            className="back-to-edit-btn"
            onClick={() => {
              setError("");
              setShowReviewScreen(false);
            }}
            disabled={submitting}
          >
            ← Back to Edit
          </button>

          <button
            type="button"
            className="submit-observation-btn"
            onClick={handleSubmitObservation}
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Observation"}
          </button>

        </div>

      </div>

    </div>
  );
}

  return (
    <div className="compliance-page">

      <div className="compliance-header">
        <div>
          <h1>Compliance</h1>
          <p>Select a location and department to continue.</p>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="compliance-success">
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && !showAddForm && !showPersonnelForm && (
  <div className="compliance-error">
    {error}
  </div>
)}

      {/* LOCATION AND DEPARTMENT SELECTION */}

<div className="selection-card">

  {/* LOCATION */}
  <div className="selection-field location-selection-field">
    <label htmlFor="location-select">
      1. Location
    </label>
    <p>Select the unit or area where the observation will take place.</p>

    <div className="location-select-row">
    <div className="custom-location-dropdown">

    {/* SELECTED LOCATION */}
    <button
      type="button"
      className="custom-location-trigger"
      onClick={() => {
        setShowLocationOptions((prev) => !prev);
        setLocationMenuId(null);
        setShowDepartmentOptions(false);
        setShowPersonnelOptions(false);
        setDepartmentMenuId(null);
        setPersonnelMenuId(null);
      }}
      disabled={loading}
    >
      <span>
        {loading
          ? "Loading locations..."
          : selectedLocation?.name || "Select Location"}
      </span>

      <span className={`category-arrow ${
        showLocationOptions ? "rotated" : ""
      }`}>
        ▼
      </span>
    </button>

    {/* LOCATION OPTIONS */}
{showLocationOptions && (
  <div className="custom-location-options">
    {locations.length === 0 ? (
      <div className="custom-location-empty">
        No locations available.
      </div>
    ) : (
      locations.map((location) => (
        <div
          key={location.id}
          data-location-id={location.id}
          className={`custom-location-option ${
            selectedLocationId === location.id ? "selected" : ""
          }`}
          onPointerDown={(e) =>
            handleLocationPointerDown(e, location.id)
          }
          onPointerUp={handleLocationPointerUp}
          onPointerLeave={handleLocationPointerUp}
          onPointerCancel={handleLocationPointerUp}
          onContextMenu={(e) =>
            handleLocationContextMenu(e, location.id)
          }
          onClick={() => {
            if (longPressTriggered.current) {
              longPressTriggered.current = false;
              return;
            }

            handleSelectLocation(location.id);
          }}
        >
          <span className="custom-location-name">
            {location.name}
          </span>

          {selectedLocationId === location.id && (
            <span className="location-selected-check">✓</span>
          )}

          {/* EDIT / REMOVE MENU */}
          {userRole === "admin" &&
            locationMenuId === location.id && (
              <div
                className="location-context-menu"
                style={{
                  top: `${locationMenuPosition.top}px`,
                  left: `${Math.max(5, locationMenuPosition.left)}px`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleEditLocation(location)}
                >
                  <span>✎</span>
                  Edit
                </button>

                <button
                  type="button"
                  className="location-delete-action"
                  onClick={() => handleDeleteLocation(location)}
                  disabled={locationDeleting}
                >
                  <span>⌫</span>
                  {locationDeleting ? "Removing..." : "Remove"}
                </button>
              </div>
            )}
        </div>
      ))
    )}
  </div>
)}
  </div>

  {/* ADD LOCATION BUTTON */}
  <button
    type="button"
    className="add-location-inline-btn"
    onClick={() => {
      setError("");
      setSuccess("");
      setLocationName("");
      setDepartmentsInput([""]);
      setShowAddForm(true);
    }}
  >
    <span className="desktop-add-text">+ Add Location</span>
    <span className="mobile-add-text">+ Add</span>
  </button>

</div>
  </div>

  {/* DEPARTMENT */}
  <div
    className={`selection-field department-selection-field ${
      showDepartmentOptions ? "dropdown-open" : ""
    }`}
  >
    <label htmlFor="department-select">
      2. Department
    </label>
    <p>Select the department from selected location.</p>

    <div className="location-select-row">
      <div className="custom-location-dropdown">
      <button
        id="department-select"
        type="button"
        className="custom-location-trigger"
        onClick={() => {
          setShowDepartmentOptions((prev) => !prev);
          setShowLocationOptions(false);
          setShowPersonnelOptions(false);
          setLocationMenuId(null);
          setPersonnelMenuId(null);
        }}
        disabled={!selectedLocationId || departments.length === 0}
      >
        <span>
          {!selectedLocationId
            ? "Select a location first"
            : selectedDepartment || "Select Department"}
        </span>
        <span className={`category-arrow ${showDepartmentOptions ? "rotated" : ""}`}>
          ▼
        </span>
      </button>

      {showDepartmentOptions && (
        <div className="custom-location-options">
          {departments.map((department, index) => (
            <div
              key={`${department}-${index}`}
              className={`custom-location-option ${
                selectedDepartment === department ? "selected" : ""
              }`}
              onPointerDown={(e) =>
                handleSelectionPointerDown(e, setDepartmentMenuId, index)
              }
              onPointerUp={handleLocationPointerUp}
              onPointerLeave={handleLocationPointerUp}
              onPointerCancel={handleLocationPointerUp}
              onContextMenu={(e) =>
                handleSelectionContextMenu(e, setDepartmentMenuId, index)
              }
              onClick={() => {
                if (longPressTriggered.current) {
                  longPressTriggered.current = false;
                  return;
                }
                setSelectedDepartment(department);
                setSelectedPersonnel("");
                setShowDepartmentOptions(false);
                setDepartmentMenuId(null);
              }}
            >
              <span className="custom-location-name">{department}</span>
              {selectedDepartment === department && (
                <span className="location-selected-check">✓</span>
              )}
              {userRole === "admin" && departmentMenuId === index && (
                <div
                  className="location-context-menu"
                  style={{
                    top: `${locationMenuPosition.top}px`,
                    left: `${locationMenuPosition.left}px`,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleEditSelection("department", department, index)}
                  >
                    <span>✎</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="location-delete-action"
                    onClick={() => handleRemoveDepartment(department, index)}
                    disabled={selectionDeleting}
                  >
                    <span>⌫</span>
                    {selectionDeleting ? "Removing..." : "Remove"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  </div>

  {/* PERSONNEL OBSERVED */}
<div className="selection-field">
  <label htmlFor="personnel-select">
    3. Personnel Observed
  </label>
  <p>Select the healthcare worker being observed</p>

  <div className="location-select-row">
    <div className="custom-location-dropdown">
      <button
        id="personnel-select"
        type="button"
        className="custom-location-trigger"
        onClick={() => {
          setShowPersonnelOptions((prev) => !prev);
          setShowLocationOptions(false);
          setShowDepartmentOptions(false);
          setLocationMenuId(null);
          setDepartmentMenuId(null);
        }}
        disabled={!selectedLocationId || !selectedDepartment}
      >
        <span>
          {!selectedLocationId
            ? "Select a location first"
            : !selectedDepartment
            ? "Select a department first"
            : filteredPersonnel.length === 0
            ? "No personnel available"
            : personnel.find((person) => person.id === selectedPersonnel)?.name ||
              "Select Personnel"}
        </span>
        <span className={`category-arrow ${showPersonnelOptions ? "rotated" : ""}`}>
          ▼
        </span>
      </button>

      {showPersonnelOptions && (
        <div className="custom-location-options">
          {filteredPersonnel.length === 0 ? (
            <div className="custom-location-empty">No personnel available.</div>
          ) : (
            filteredPersonnel.map((person) => (
              <div
                key={person.id}
                className={`custom-location-option ${
                  selectedPersonnel === person.id ? "selected" : ""
                }`}
                onPointerDown={(e) =>
                  handleSelectionPointerDown(e, setPersonnelMenuId, person.id)
                }
                onPointerUp={handleLocationPointerUp}
                onPointerLeave={handleLocationPointerUp}
                onPointerCancel={handleLocationPointerUp}
                onContextMenu={(e) =>
                  handleSelectionContextMenu(e, setPersonnelMenuId, person.id)
                }
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false;
                    return;
                  }
                  setSelectedPersonnel(person.id);
                  setShowPersonnelOptions(false);
                  setPersonnelMenuId(null);
                }}
              >
                <span className="custom-location-name">{person.name}</span>
                {selectedPersonnel === person.id && (
                  <span className="location-selected-check">✓</span>
                )}
                {userRole === "admin" && personnelMenuId === person.id && (
                  <div
                    className="location-context-menu"
                    style={{
                      top: `${locationMenuPosition.top}px`,
                      left: `${locationMenuPosition.left}px`,
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleEditSelection("personnel", person)}
                    >
                      <span>✎</span>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="location-delete-action"
                      onClick={() => handleRemovePersonnel(person)}
                      disabled={selectionDeleting}
                    >
                      <span>⌫</span>
                      {selectionDeleting ? "Removing..." : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>

    <button
      type="button"
      className="add-location-inline-btn"
      onClick={() => {
        setError("");
        setSuccess("");
        setShowPersonnelForm(true);
      }}
    >
      <span className="desktop-add-text">+ Add Personnel</span>
      <span className="mobile-add-text">+ Add</span>
    </button>
  </div>
</div>

{/* MOMENT OF HYGIENE */}
<div className="selection-field moment-selection-field">

  <label>4. Moment of Hygiene</label>

  <p>Which moment applies to this observation?</p>

  <button
    type="button"
    className={`moment-dropdown-toggle ${
      showMomentOptions ? "expanded" : ""
    }`}
    onClick={() => setShowMomentOptions((prev) => !prev)}
  >
    <span>
      {selectedMoments.length === 0
        ? "Select Moment of Hygiene"
        : `${selectedMoments.length} moment(s) selected`}
    </span>

    <span className={`category-arrow ${
      showMomentOptions ? "rotated" : ""
    }`}>
      ▼
    </span>
  </button>

  {showMomentOptions && (
    <div className="moment-checkbox-list">

      {hygieneMoments.map((moment) => (
        <label
          key={moment.id}
          className={`moment-checkbox-item ${
            selectedMoments.includes(moment.id) ? "selected" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={selectedMoments.includes(moment.id)}
            onChange={() => handleMomentChange(moment.id)}
          />

          <span className="moment-checkbox-content">
            <strong>{moment.label}*</strong>
            <span>{moment.description}</span>
          </span>
        </label>
      ))}

    </div>
  )}

  <p className="moment-selection-count">
    {selectedMoments.length} of 5 moments selected
  </p>

</div>

  {/* COMPLIANCE DETERMINATION */}
<div className="selection-field determination-field">

  <label>5. Compliance Determination</label>

  {/* COMPLIED / MISSED BUTTONS */}
  <div className="determination-buttons">

    <button
      type="button"
      className={`determination-btn complied-btn ${
        complianceDetermination === "Complied" ? "active" : ""
      }`}
      onClick={() => handleDeterminationChange("Complied")}
    >
      <span>✓</span>
      Complied
    </button>

    <button
      type="button"
      className={`determination-btn missed-btn ${
        complianceDetermination === "Missed" ? "active" : ""
      }`}
      onClick={() => handleDeterminationChange("Missed")}
    >
      <span>✕</span>
      Missed
    </button>

  </div>

  {/* COMPLIED DESCRIPTION */}
  {complianceDetermination === "Complied" && (
    <div className="determination-description complied-description">
      <strong>Hand Hygiene Performed</strong>
      <p>
        Hand hygiene was performed using alcohol-based hand rub
        or soap and water.
      </p>
    </div>
  )}

  {/* MISSED REASONS */}
  {complianceDetermination === "Missed" && (
    <div className="missed-reasons-container">

      <p className="missed-reasons-instruction">
        What hindered or contributed to the missed hand hygiene
        opportunity? Select all that apply.
      </p>

      <div className="missed-reasons-list">

        {missedReasonCategories.map((group) => {
          const isExpanded = expandedMissedCategories.includes(
            group.category
          );

          const selectedCount = group.reasons.filter((reason) =>
            missedReasons.includes(reason)
          ).length;

          return (
            <div className="missed-reason-group" key={group.category}>

              {/* CATEGORY HEADER */}
              <button
                type="button"
                className={`missed-category-toggle ${
                  isExpanded ? "expanded" : ""
                }`}
                onClick={() =>
                  handleMissedCategoryToggle(group.category)
                }
              >
                <span className="missed-category-title">
                  {group.category}

                  {selectedCount > 0 && (
                    <span className="category-selected-count">
                      {selectedCount}
                    </span>
                  )}
                </span>

                <span
                  className={`category-arrow ${
                    isExpanded ? "rotated" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* CATEGORY OPTIONS */}
              {isExpanded && (
                <div className="missed-reason-options">

                  {group.reasons.map((reason) => (
                    <label
                      key={reason}
                      className={`missed-reason-option ${
                        missedReasons.includes(reason)
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={missedReasons.includes(reason)}
                        onChange={() =>
                          handleMissedReasonChange(reason)
                        }
                      />

                      <span>{reason}</span>
                    </label>
                  ))}

                </div>
              )}

            </div>
          );
        })}

      </div>

      {/* OTHER DESCRIPTION */}
      {missedReasons.includes("Other") && (
        <div className="other-reason-field">

          <label htmlFor="other-missed-reason">
            Please specify other reason
          </label>

          <textarea
            id="other-missed-reason"
            value={otherMissedReason}
            onChange={(e) =>
              setOtherMissedReason(e.target.value)
            }
            placeholder="Enter the reason..."
            rows={3}
          />

        </div>
      )}

      <p className="missed-reason-count">
        {missedReasons.length} reason(s) selected
      </p>

    </div>
  )}

</div>

{/* REVIEW AND SUBMIT BUTTON */}
<div className="compliance-form-actions">

  <button
    type="button"
    className="review-observation-btn"
    onClick={handleOpenReview}
  >
    Review & Submit
    <span>→</span>
  </button>

</div>

</div>


      {/* ADD LOCATION MODAL */}
      {showAddForm && (
        <div
          className="location-modal-overlay"
          onClick={handleCloseForm}
        >
          <div
            className="location-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="location-modal-header">
              <div>
                <h2>Add Location</h2>
                <p>Create a location and add its department.</p>
              </div>

              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseForm}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>

              <div className="selection-field">
                <label htmlFor="new-location-name">
                  Location Name
                </label>

                <input
                  id="new-location-name"
                  type="text"
                  placeholder="Enter location name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                />
              </div>

              <div className="selection-field">
  <label>Departments</label>

  <div className="department-input-list">
    {departmentsInput.map((department, index) => (
      <div className="department-input-row" key={index}>
        <input
          type="text"
          placeholder={`Department ${index + 1}`}
          value={department}
          onChange={(e) =>
            handleDepartmentInputChange(index, e.target.value)
          }
        />

        {departmentsInput.length > 1 && (
          <button
            type="button"
            className="remove-department-btn"
            onClick={() => handleRemoveDepartmentField(index)}
            disabled={saving}
          >
            ×
          </button>
        )}
      </div>
    ))}
  </div>

  <button
    type="button"
    className="add-department-field-btn"
    onClick={handleAddDepartmentField}
    disabled={saving}
  >
    + Add Another Department
  </button>
</div>

              {error && (
                <div className="compliance-error">
                  {error}
                </div>
              )}

              <div className="location-modal-actions">
                <button
                  type="button"
                  className="cancel-location-btn"
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-location-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Location"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* EDIT LOCATION MODAL */}
{editingLocationId && (
  <div
    className="location-modal-overlay"
    onClick={handleCloseEditLocation}
  >
    <div
      className="location-modal"
      onClick={(e) => e.stopPropagation()}
    >

      <div className="location-modal-header">
        <div>
          <h2>Edit Location</h2>
          <p>
            Update the location name and manage its departments.
          </p>
        </div>

        <button
          type="button"
          className="close-modal-btn"
          onClick={handleCloseEditLocation}
          disabled={saving}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleUpdateLocation}>

        {/* LOCATION NAME */}
        <div className="selection-field">
          <label htmlFor="edit-location-name">
            Location Name
          </label>

          <input
            id="edit-location-name"
            type="text"
            placeholder="Enter location name"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
          />
        </div>

        {/* DEPARTMENTS */}
        <div className="selection-field">

          <label>Departments</label>

          <div className="department-input-list">

            {departmentsInput.map((department, index) => (
              <div className="department-input-row" key={index}>

                <input
                  type="text"
                  placeholder={`Department ${index + 1}`}
                  value={department}
                  onChange={(e) =>
                    handleDepartmentInputChange(index, e.target.value)
                  }
                />

                {departmentsInput.length > 1 && (
                  <button
                    type="button"
                    className="remove-department-btn"
                    onClick={() => handleRemoveDepartmentField(index)}
                    disabled={saving}
                  >
                    ×
                  </button>
                )}

              </div>
            ))}

          </div>

          <button
            type="button"
            className="add-department-field-btn"
            onClick={handleAddDepartmentField}
            disabled={saving}
          >
            + Add Another Department
          </button>

        </div>

        {error && (
          <div className="compliance-error">
            {error}
          </div>
        )}

        <div className="location-modal-actions">

          <button
            type="button"
            className="cancel-location-btn"
            onClick={handleCloseEditLocation}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-location-btn"
            disabled={saving}
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>

        </div>

      </form>

    </div>
  </div>
)}

{/* EDIT DEPARTMENT OR PERSONNEL MODAL */}
{editingSelection && (
  <div
    className="location-modal-overlay"
    onClick={handleCloseSelectionEdit}
  >
    <div
      className="location-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="location-modal-header">
        <div>
          <h2>
            Edit {editingSelection.type === "department" ? "Department" : "Personnel"}
          </h2>
          <p>Update the name only.</p>
        </div>
        <button
          type="button"
          className="close-modal-btn"
          onClick={handleCloseSelectionEdit}
          disabled={selectionSaving}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSaveSelectionEdit}>
        <div className="selection-field">
          <label htmlFor="edit-selection-name">
            {editingSelection.type === "department" ? "Department Name" : "Personnel Name"}
          </label>
          <input
            id="edit-selection-name"
            type="text"
            value={selectionEditName}
            onChange={(e) => setSelectionEditName(e.target.value)}
            required
          />
        </div>

        {error && <div className="compliance-error">{error}</div>}

        <div className="location-modal-actions">
          <button
            type="button"
            className="cancel-location-btn"
            onClick={handleCloseSelectionEdit}
            disabled={selectionSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-location-btn"
            disabled={selectionSaving}
          >
            {selectionSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      
{/* ADD PERSONNEL MODAL */}
{showPersonnelForm && (
  <div
    className="location-modal-overlay"
    onClick={handleClosePersonnelForm}
  >
    <div
      className="location-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="location-modal-header">
        <div>
          <h2>Add Personnel</h2>
          <p>
            Register healthcare personnel. You can select
            them for any location and department later.
          </p>
        </div>

        <button
          type="button"
          className="close-modal-btn"
          onClick={handleClosePersonnelForm}
          disabled={personnelSaving}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSavePersonnel}>

        {/* STAFF NAMES */}
        <div className="selection-field">
          <label>Personnel Names</label>

          <div className="department-input-list">
            {staffNamesInput.map((name, index) => (
              <div className="department-input-row" key={index}>
                <input
                  type="text"
                  placeholder={`Personnel Name ${index + 1}`}
                  value={name}
                  onChange={(e) =>
                    handleStaffNameChange(index, e.target.value)
                  }
                  required
                />

                {staffNamesInput.length > 1 && (
                  <button
                    type="button"
                    className="remove-department-btn"
                    onClick={() => handleRemoveStaffField(index)}
                    disabled={personnelSaving}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-department-field-btn"
            onClick={handleAddStaffField}
            disabled={personnelSaving}
          >
            + Add Another Personnel
          </button>
        </div>

        {error && (
          <div className="compliance-error">
            {error}
          </div>
        )}

        <div className="location-modal-actions">
          <button
            type="button"
            className="cancel-location-btn"
            onClick={handleClosePersonnelForm}
            disabled={personnelSaving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-location-btn"
            disabled={personnelSaving}
          >
            {personnelSaving
              ? "Saving..."
              : "Save Personnel"}
          </button>
        </div>

      </form>
    </div>
  </div>
)}

{/* REQUIRED FIELD POPUP */}
{showRequiredPopup && (
  <div className="required-popup-overlay">
    <div className="required-popup">
      <div className="required-popup-icon">!</div>

      <h3>Required Field</h3>

      <p>{requiredMessage}</p>

      <button
        type="button"
        onClick={() => setShowRequiredPopup(false)}
      >
        OK
      </button>
    </div>
  </div>
)}

    </div>
  );
}
