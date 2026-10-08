"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    User,
    Briefcase,
    AlertCircle,
    Loader2,
    Save,
    Upload,
    Landmark,
    FileText,
    X,
    CheckCircle2,
    ChevronRight,
    Camera,
    Image as ImageIcon,
    Trash2,
    Users,
    CalendarDays,
    IndianRupee,
    Building2,
    Mail,
    Phone,
    BadgeCheck,
    CreditCard,
    MapPin,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const GENDER_OPTIONS = [
    {
        value: "male",
        label: "Male",
        sub: "Identify as male",
    },
    {
        value: "female",
        label: "Female",
        sub: "Identify as female",
    },
    {
        value: "other",
        label: "Other",
        sub: "Prefer not to say",
    },
];

const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
    "Probationary",
    "Internship",
    "Remote",
    "Hybrid",
    "Freelance",
];

const EMPLOYEE_STATUS_OPTIONS = [
    "Active",
    "Probation",
    "Notice Period",
    "On Leave",
    "Permanent",
    "Freelancer",
    "Inactive",
];

const REPORTING_MANAGER_OPTIONS = [
    "Sanjay Sir",
    "Nitesh Sir",
    "Vimal Sir",
];

const NATIONAL_ID_OPTIONS = [
    "Aadhaar Card",
    "PAN Card",
    "Voter ID",
    "Driving License",
    "Other Official ID",
];

const DESIGNATION_PRESETS = [
    "Software Engineer",
    "Senior Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "UI/UX Designer",
    "Product Designer",
    "Project Manager",
    "Product Manager",
    "Team Lead",
    "HR Executive",
    "HR Manager",
    "Accountant",
    "Finance Executive",
    "Sales Executive",
    "Business Development Executive",
    "Marketing Executive",
    "Operations Executive",
    "Customer Support Executive",
    "IT Support Executive",
    "Office Administrator",
    "Intern",
];

const DEPARTMENT_PRESETS = [
    "Human Resources",
    "Engineering",
    "Information Technology",
    "Finance",
    "Accounts",
    "Sales",
    "Marketing",
    "Operations",
    "Administration",
    "Customer Support",
    "Product",
    "Design",
    "Legal",
    "Procurement",
    "Quality Assurance",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const errorInputClass =
    "w-full px-4 py-3 bg-white border border-red-400 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const normalizeText = (value = "") =>
    String(value)
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

const normalizeEmail = (value = "") =>
    String(value).trim().toLowerCase();

const normalizePhone = (value = "") =>
    String(value).replace(/\D/g, "");

const getEmployeeName = (employee) => {
    if (!employee) return "";

    return (
        employee.name ||
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
    );
};

const getLookupId = (item) => {
    if (!item) return "";

    if (typeof item === "object") {
        return item._id || item.id || "";
    }

    return item;
};

const getLookupLabel = (item) => {
    if (!item) return "";

    if (typeof item === "object") {
        return (
            item.title ||
            item.name ||
            item.label ||
            item.designation ||
            item.department ||
            ""
        );
    }

    return item;
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function FieldError({ children }) {
    if (!children) return null;

    return (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-red-600">
            <AlertCircle size={13} />
            <span>{children}</span>
        </div>
    );
}

function SectionTitle({ title, description }) {
    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
    );
}

function UploadCard({
    title,
    subtitle,
    fileName,
    preview,
    onClick,
    onRemove,
    acceptText = "JPG, PNG, WEBP, PDF · up to 10MB",
}) {
    return (
        <div>
            <div
                onClick={onClick}
                className={`group relative min-h-[190px] border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${fileName
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"
                    }`}
            >
                {preview ? (
                    <div className="absolute inset-0">
                        <img
                            src={preview}
                            alt={title}
                            className="w-full h-full object-contain p-4"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pt-10 pb-3">
                            <p className="text-xs font-semibold text-white truncate">
                                {fileName}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[190px] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                            <Upload size={21} />
                        </div>

                        <p className="text-xs font-bold text-slate-700">
                            {title}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-1">
                            {subtitle}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-3">
                            {acceptText}
                        </p>
                    </div>
                )}

                {fileName && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.();
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-slate-200 text-red-500 flex items-center justify-center shadow-sm hover:bg-red-50"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    title,
    status,
    active,
    children,
}) {
    return (
        <div
            className={`rounded-2xl border p-4 transition-all ${active
                ? "border-indigo-500 bg-indigo-50/40 shadow-sm"
                : "border-slate-200 bg-white"
                }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Icon size={15} />
                    </div>

                    <span className="text-xs font-bold text-slate-900">
                        {title}
                    </span>
                </div>

                <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${status === "Done"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                        }`}
                >
                    {status}
                </span>
            </div>

            <div className="space-y-2">{children}</div>
        </div>
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 shrink-0">{label}</span>
            <span className="font-semibold text-slate-700 text-right truncate max-w-[160px]">
                {value || "—"}
            </span>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

function EmployeeFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const editId = searchParams.get("id");

    const frontIdRef = useRef(null);
    const backIdRef = useRef(null);
    const passportPhotoRef = useRef(null);

    const [currentStep, setCurrentStep] = useState(1);

    const [form, setForm] = useState({
        employeeId: "",

        // Personal
        firstName: "",
        lastName: "",
        name: "",
        email: "",
        phone: "",
        gender: "male",
        timeZone: "Asia/Kolkata (GMT+5:30)",

        // Profile photo
        avatar: "",
        profilePhotoFileName: "",
        profilePhotoData: "",

        // Job
        designation: "",
        designationOther: "",
        department: "",
        departmentOther: "",
        employmentType: "Full-time",
        reportingManager: "",
        reportingManagerOther: "",
        dateOfJoining: "",
        employeeStatus: "Active",
        salary: "",

        // Documents
        nationalIdType: "Aadhaar Card",
        nationalIdOther: "",
        nationalId: "",

        nationalIdFrontFileName: "",
        nationalIdFrontFileData: "",

        nationalIdBackFileName: "",
        nationalIdBackFileData: "",

        passportPhotoFileName: "",
        passportPhotoData: "",

        // Banking
        accountName: "",
        bankName: "",
        branchName: "",
        accountNumber: "",
        ifscCode: "",
        // Address
        address: "",
        city: "",
        state: "",
        pincode: "",

        role: "Employee",
    });

    const [departmentsList, setDepartmentsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [managersList, setManagersList] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const [duplicateErrors, setDuplicateErrors] = useState({
        name: "",
        email: "",
        phone: "",
    });

    /* ------------------------------------------------------------------------ */
    /* LOOKUPS                                                                  */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        async function loadLookups() {
            try {
                const results = await Promise.allSettled([
                    api.get("/organization/departments?status=active"),
                    api.get("/organization/designations?status=active"),
                    api.get("/employees"),
                ]);

                const [deptRes, desigRes, employeesRes] = results;

                if (deptRes.status === "fulfilled") {
                    const raw = deptRes.value?.data;

                    const list = Array.isArray(raw)
                        ? raw
                        : raw?.data ||
                        raw?.departments ||
                        [];

                    setDepartmentsList(list);
                }

                if (desigRes.status === "fulfilled") {
                    const raw = desigRes.value?.data;

                    const list = Array.isArray(raw)
                        ? raw
                        : raw?.data ||
                        raw?.designations ||
                        [];

                    setDesignationsList(list);
                }

                if (employeesRes.status === "fulfilled") {
                    const raw = employeesRes.value?.data;

                    const list = Array.isArray(raw)
                        ? raw
                        : raw?.data ||
                        raw?.employees ||
                        [];

                    setEmployeesList(list);
                    setManagersList(list);

                    if (!editId) {
                        const nextNum = list.length + 1;

                        setForm((prev) => ({
                            ...prev,
                            employeeId: `EMP-${String(nextNum).padStart(3, "0")}`,
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load employee options", err);
            }
        }

        loadLookups();
    }, [editId]);

    /* ------------------------------------------------------------------------ */
    /* EDIT EMPLOYEE                                                            */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        if (!editId) return;

        async function loadEmployee() {
            try {
                setFetching(true);

                const res = await api.get(`/employees/${editId}`);

                const emp =
                    res?.data?.employee ||
                    res?.data?.data ||
                    res?.data;

                if (!emp) return;

                const fullName =
                    emp.name ||
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim();

                const parts = fullName.split(" ");

                const firstName =
                    emp.firstName ||
                    parts[0] ||
                    "";

                const lastName =
                    emp.lastName ||
                    parts.slice(1).join(" ") ||
                    "";

                const profilePhoto =
                    emp.avatar ||
                    emp.profilePhoto ||
                    emp.profilePhotoData ||
                    emp.photo ||
                    "";

                setForm((prev) => ({
                    ...prev,

                    employeeId:
                        emp.employeeId ||
                        `EMP-${String(editId).slice(-4)}`,

                    firstName,
                    lastName,
                    name: fullName,

                    email: emp.email || "",
                    phone: emp.phone || "",

                    gender:
                        String(emp.gender || "male").toLowerCase(),

                    avatar: profilePhoto,
                    profilePhotoData: profilePhoto,

                    profilePhotoFileName:
                        emp.profilePhotoFileName || "",

                    designation:
                        typeof emp.designation === "object"
                            ? emp.designation?._id
                            : emp.designation || "",

                    department:
                        typeof emp.department === "object"
                            ? emp.department?._id
                            : emp.department || "",

                    employmentType:
                        emp.employmentType || "Full-time",

                    reportingManager:
                        typeof emp.reportingManager === "object"
                            ? getEmployeeName(emp.reportingManager)
                            : REPORTING_MANAGER_OPTIONS.includes(emp.reportingManager)
                                ? emp.reportingManager
                                : emp.reportingManager
                                    ? "Other"
                                    : "",

                    reportingManagerOther:
                        typeof emp.reportingManager === "object"
                            ? ""
                            : REPORTING_MANAGER_OPTIONS.includes(emp.reportingManager)
                                ? ""
                                : emp.reportingManager || "",

                    employeeStatus:
                        emp.employeeStatus || "Active",

                    dateOfJoining:
                        emp.dateOfJoining
                            ? String(emp.dateOfJoining).split("T")[0]
                            : "",

                    salary: emp.salary ?? "",

                    nationalIdType:
                        emp.nationalIdType ||
                        emp.documents?.nationalIdType ||
                        "Aadhaar Card",

                    nationalIdOther:
                        emp.nationalIdOther ||
                        emp.documents?.nationalIdOther ||
                        "",

                    nationalId:
                        emp.nationalId ||
                        emp.idProofNumber ||
                        "",

                    nationalIdFrontFileName:
                        emp.documents?.nationalIdFrontFileName || "",

                    nationalIdFrontFileData:
                        emp.documents?.nationalIdFrontFileData || "",

                    nationalIdBackFileName:
                        emp.documents?.nationalIdBackFileName || "",

                    nationalIdBackFileData:
                        emp.documents?.nationalIdBackFileData || "",

                    passportPhotoFileName:
                        emp.documents?.passportPhotoFileName || "",

                    passportPhotoData:
                        emp.documents?.passportPhotoData ||
                        profilePhoto ||
                        "",

                    accountName:
                        emp.bankDetails?.accountName ||
                        fullName,

                    bankName:
                        emp.bankDetails?.bankName || "",

                    branchName:
                        emp.bankDetails?.branchName || "",

                    accountNumber:
                        emp.bankDetails?.accountNumber || "",

                    ifscCode:
                        emp.bankDetails?.ifscCode || "",

                    address:
                        emp.address || "",

                    city:
                        emp.city || "",

                    state:
                        emp.state || "",

                    pincode:
                        emp.pincode || "",
                }));
            } catch (err) {
                console.error(err);
                setError("Failed to fetch employee record.");
            } finally {
                setFetching(false);
            }
        }

        loadEmployee();
    }, [editId]);

    /* ------------------------------------------------------------------------ */
    /* OPTIONS                                                                  */
    /* ------------------------------------------------------------------------ */

    const designationOptions = useMemo(() => {
        const apiOptions = designationsList
            .map((item) => ({
                value: getLookupId(item),
                label: getLookupLabel(item),
            }))
            .filter((item) => item.value && item.label);

        const presetOptions = DESIGNATION_PRESETS.map((item) => ({
            value: item,
            label: item,
        }));

        const map = new Map();

        [...apiOptions, ...presetOptions].forEach((item) => {
            if (!map.has(item.value)) {
                map.set(item.value, item);
            }
        });

        return [...map.values()];
    }, [designationsList]);

    const departmentOptions = useMemo(() => {
        const apiOptions = departmentsList
            .map((item) => ({
                value: getLookupId(item),
                label: getLookupLabel(item),
            }))
            .filter((item) => item.value && item.label);

        const presetOptions = DEPARTMENT_PRESETS.map((item) => ({
            value: item,
            label: item,
        }));

        const map = new Map();

        [...apiOptions, ...presetOptions].forEach((item) => {
            if (!map.has(item.value)) {
                map.set(item.value, item);
            }
        });

        return [...map.values()];
    }, [departmentsList]);

    const selectedDesignation = useMemo(() => {
        const option = designationOptions.find(
            (item) => item.value === form.designation
        );

        return (
            option?.label ||
            form.designationOther ||
            form.designation ||
            "—"
        );
    }, [
        designationOptions,
        form.designation,
        form.designationOther,
    ]);

    const selectedDepartment = useMemo(() => {
        const option = departmentOptions.find(
            (item) => item.value === form.department
        );

        return (
            option?.label ||
            form.departmentOther ||
            form.department ||
            "—"
        );
    }, [
        departmentOptions,
        form.department,
        form.departmentOther,
    ]);

    /* ------------------------------------------------------------------------ */
    /* DUPLICATE CHECK                                                          */
    /* ------------------------------------------------------------------------ */

    const getDuplicateErrors = (candidate) => {
        const errors = {
            name: "",
            email: "",
            phone: "",
        };

        const candidateName = normalizeText(
            candidate.name ||
            `${candidate.firstName || ""} ${candidate.lastName || ""}`
        );

        const candidateEmail = normalizeEmail(candidate.email);

        const candidatePhone = normalizePhone(candidate.phone);

        if (!candidateName && !candidateEmail && !candidatePhone) {
            return errors;
        }

        const duplicate = employeesList.find((employee) => {
            const employeeId =
                employee?._id ||
                employee?.id ||
                employee?.employeeId;

            // Don't compare the employee with itself while editing.
            if (editId && String(employeeId) === String(editId)) {
                return false;
            }

            const employeeName = normalizeText(
                getEmployeeName(employee)
            );

            const employeeEmail = normalizeEmail(
                employee.email
            );

            const employeePhone = normalizePhone(
                employee.phone
            );

            if (
                candidateName &&
                employeeName &&
                candidateName === employeeName
            ) {
                errors.name =
                    "This employee name is already added.";
            }

            if (
                candidateEmail &&
                employeeEmail &&
                candidateEmail === employeeEmail
            ) {
                errors.email =
                    "This email is already registered.";
            }

            if (
                candidatePhone &&
                employeePhone &&
                candidatePhone === employeePhone
            ) {
                errors.phone =
                    "This phone number is already registered.";
            }

            return Boolean(
                errors.name ||
                errors.email ||
                errors.phone
            );
        });

        if (!duplicate) {
            return errors;
        }

        return errors;
    };

    /* Re-check whenever employee list arrives or form changes. */
    useEffect(() => {
        if (!employeesList.length) return;

        setDuplicateErrors(
            getDuplicateErrors(form)
        );
    }, [
        employeesList,
        form.firstName,
        form.lastName,
        form.email,
        form.phone,
        editId,
    ]);

    /* ------------------------------------------------------------------------ */
    /* INPUT CHANGE                                                             */
    /* ------------------------------------------------------------------------ */

    const handleChange = (e) => {
        const { name, value } = e.target;

        setError("");

        setForm((prev) => {
            const updated = {
                ...prev,
                [name]: value,
            };

            if (
                name === "firstName" ||
                name === "lastName"
            ) {
                updated.name =
                    `${name === "firstName" ? value : prev.firstName} ${name === "lastName" ? value : prev.lastName
                        }`.trim();

                updated.accountName = updated.name;
            }

            return updated;
        });
    };

    /* ------------------------------------------------------------------------ */
    /* FILE UPLOAD                                                              */
    /* ------------------------------------------------------------------------ */

    const readFile = (file, callback, imagesOnly = false) => {
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File size must be less than 10MB.");
            return;
        }

        const isImage = file.type.startsWith("image/");
        const allowed = imagesOnly
            ? isImage
            : isImage || file.type === "application/pdf";

        if (!allowed) {
            toast.error(
                imagesOnly
                    ? "Only JPG, PNG or WEBP images are allowed."
                    : "Only JPG, PNG, WEBP or PDF files are allowed."
            );
            return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
            callback(reader.result, file.name);
        };

        reader.readAsDataURL(file);
    };

    const handleProfilePhoto = (e) => {
        const file = e.target.files?.[0];

        readFile(file, (data, name) => {
            setForm((prev) => ({
                ...prev,
                avatar: data,
                profilePhotoData: data,
                profilePhotoFileName: name,
                passportPhotoData: data,
                passportPhotoFileName: name,
            }));
        });
    };

    const handleDocumentUpload = (
        e,
        dataKey,
        nameKey,
        imagesOnly = false
    ) => {
        const file = e.target.files?.[0];

        readFile(file, (data, name) => {
            setForm((prev) => ({
                ...prev,
                [dataKey]: data,
                [nameKey]: name,
            }));
        }, imagesOnly);
    };

    const removeFile = (dataKey, nameKey) => {
        setForm((prev) => ({
            ...prev,
            [dataKey]: "",
            [nameKey]: "",
        }));
    };

    /* ------------------------------------------------------------------------ */
    /* VALIDATION                                                               */
    /* ------------------------------------------------------------------------ */

    const validateStep = () => {
        setError("");

        const duplicates = getDuplicateErrors(form);

        setDuplicateErrors(duplicates);

        if (
            duplicates.name ||
            duplicates.email ||
            duplicates.phone
        ) {
            setError(
                "Please fix the duplicate employee details before continuing."
            );

            if (
                currentStep !== 1
            ) {
                setCurrentStep(1);
            }

            return false;
        }

        if (currentStep === 1) {
            if (!form.firstName.trim()) {
                setError("First Name is required.");
                return false;
            }

            if (!form.lastName.trim()) {
                setError("Last Name is required.");
                return false;
            }

            if (!form.email.trim()) {
                setError("Email address is required.");
                return false;
            }

            if (!/^\S+@\S+\.\S+$/.test(form.email)) {
                setError("Please enter a valid email address.");
                return false;
            }

            if (
                form.phone &&
                normalizePhone(form.phone).length < 10
            ) {
                setError("Please enter a valid phone number.");
                return false;
            }
        }

        if (currentStep === 2) {
            if (!form.department) {
                setError("Department is required.");
                return false;
            }

            if (
                form.department === "Other" &&
                !form.departmentOther.trim()
            ) {
                setError("Please enter the department name.");
                return false;
            }

            if (!form.designation) {
                setError("Designation is required.");
                return false;
            }

            if (
                form.designation === "Other" &&
                !form.designationOther.trim()
            ) {
                setError("Please enter the designation.");
                return false;
            }
        }

        if (currentStep === 3) {
            // Documents are intentionally optional.
            // If you want mandatory documents, add required validation here.
        }

        if (currentStep === 4) {
            // Banking is optional.
        }

        return true;
    };

    /* ------------------------------------------------------------------------ */
    /* NEXT                                                                     */
    /* ------------------------------------------------------------------------ */

    const handleNext = () => {
        if (!validateStep()) return;

        if (currentStep < 4) {
            setCurrentStep((prev) => prev + 1);
            return;
        }

        handleSubmitForm();
    };

    /* ------------------------------------------------------------------------ */
    /* SUBMIT                                                                   */
    /* ------------------------------------------------------------------------ */

    const handleSubmitForm = async () => {
        setLoading(true);
        setError("");

        try {
            const duplicates = getDuplicateErrors(form);

            setDuplicateErrors(duplicates);

            if (
                duplicates.name ||
                duplicates.email ||
                duplicates.phone
            ) {
                setCurrentStep(1);
                setError(
                    "Employee already exists with the same name, email or phone."
                );
                setLoading(false);
                return;
            }

            const finalDesignation =
                form.designation === "Other"
                    ? form.designationOther
                    : form.designation;

            const finalDepartment =
                form.department === "Other"
                    ? form.departmentOther
                    : form.department;

            const payload = {
                ...form,

                name:
                    `${form.firstName} ${form.lastName}`.trim(),

                designation: finalDesignation,
                department: finalDepartment,

                reportingManager:
                    form.reportingManager === "Other"
                        ? form.reportingManagerOther.trim()
                        : form.reportingManager,

                nationalIdType: form.nationalIdType,
                nationalIdOther: form.nationalIdOther,

                salary: form.salary
                    ? Number(form.salary)
                    : 0,

                idProofNumber:
                    form.nationalId ||
                    "",

                bankDetails: {
                    accountName: form.accountName,
                    bankName: form.bankName,
                    branchName: form.branchName,
                    accountNumber: form.accountNumber,
                    ifscCode: form.ifscCode,
                },

                documents: {
                    nationalIdFrontFileName:
                        form.nationalIdFrontFileName,

                    nationalIdFrontFileData:
                        form.nationalIdFrontFileData,

                    nationalIdBackFileName:
                        form.nationalIdBackFileName,

                    nationalIdBackFileData:
                        form.nationalIdBackFileData,

                    passportPhotoFileName:
                        form.passportPhotoFileName,

                    passportPhotoData:
                        form.passportPhotoData,
                },

                // Keep profile image easy for employee profile/list API.
                avatar:
                    form.profilePhotoData ||
                    form.avatar ||
                    "",
            };

            if (editId) {
                await api.put(
                    `/employees/${editId}`,
                    payload
                );

                toast.success(
                    "Employee updated successfully!"
                );
            } else {
                await api.post(
                    "/employees",
                    payload
                );

                toast.success(
                    "Employee registered successfully!"
                );
            }

            router.push("/employees");
        } catch (err) {
            console.error(err);

            const status = err?.response?.status;

            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Failed to save employee record.";

            if (status === 409) {
                setError(
                    "This employee already exists. Please check name, email or phone number."
                );
                setCurrentStep(1);
            } else {
                setError(msg);
            }

            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------------------------------------------------ */
    /* STEP STATUS                                                              */
    /* ------------------------------------------------------------------------ */

    const isStep1Done = Boolean(
        form.firstName &&
        form.lastName &&
        form.email &&
        !duplicateErrors.name &&
        !duplicateErrors.email
    );

    const isStep2Done = Boolean(
        form.department &&
        form.designation
    );

    const isStep3Done = Boolean(
        form.nationalIdType ||
        form.nationalId ||
        form.nationalIdFrontFileData ||
        form.nationalIdBackFileData ||
        form.passportPhotoData
    );

    const isStep4Done = Boolean(
        form.accountNumber &&
        form.bankName
    );

    /* ------------------------------------------------------------------------ */
    /* LOADING                                                                  */
    /* ------------------------------------------------------------------------ */

    if (fetching) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2
                        size={32}
                        className="animate-spin text-indigo-600"
                    />
                    <p className="text-xs text-slate-500 font-medium">
                        Loading employee profile...
                    </p>
                </div>
            </div>
        );
    }

    /* ------------------------------------------------------------------------ */
    /* UI                                                                       */
    /* ------------------------------------------------------------------------ */

    return (
        <div className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

                    {/* ---------------------------------------------------------------- */}
                    {/* HEADER                                                           */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <User size={20} />
                            </div>

                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                                    {editId
                                        ? "Edit Employee"
                                        : "Add Employee"}
                                </h1>

                                <p className="text-xs text-slate-500 mt-0.5">
                                    Create a complete professional employee profile
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition"
                        >
                            <X size={17} />
                        </button>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* STEPS                                                            */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50/60">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                {
                                    step: 1,
                                    title: "Personal Info",
                                    icon: User,
                                },
                                {
                                    step: 2,
                                    title: "Job Details",
                                    icon: Briefcase,
                                },
                                {
                                    step: 3,
                                    title: "Documents",
                                    icon: FileText,
                                },
                                {
                                    step: 4,
                                    title: "Banking Info",
                                    icon: Landmark,
                                },
                            ].map((item) => {
                                const active =
                                    currentStep === item.step;

                                const passed =
                                    currentStep > item.step;

                                const Icon = item.icon;

                                return (
                                    <button
                                        type="button"
                                        key={item.step}
                                        onClick={() =>
                                            setCurrentStep(item.step)
                                        }
                                        className={`text-left rounded-2xl border p-3 transition-all ${active
                                            ? "border-indigo-300 bg-indigo-50 shadow-sm"
                                            : passed
                                                ? "border-emerald-200 bg-emerald-50/40"
                                                : "border-slate-200 bg-white hover:border-indigo-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${active
                                                    ? "bg-indigo-600 text-white"
                                                    : passed
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-slate-100 text-slate-500"
                                                    }`}
                                            >
                                                {passed ? (
                                                    <CheckCircle2 size={15} />
                                                ) : (
                                                    <Icon size={15} />
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                                                    Step {item.step}
                                                </p>

                                                <p className="text-xs font-bold text-slate-800">
                                                    {item.title}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* GLOBAL ERROR                                                     */}
                    {/* ---------------------------------------------------------------- */}

                    {error && (
                        <div className="mx-6 sm:mx-8 mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                            <AlertCircle
                                size={17}
                                className="shrink-0 mt-0.5"
                            />

                            <div>
                                <p className="text-xs font-bold">
                                    Please check the form
                                </p>

                                <p className="text-[11px] mt-0.5">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------------------- */}
                    {/* MAIN                                                             */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8">

                        {/* ============================================================ */}
                        {/* SIDEBAR                                                       */}
                        {/* ============================================================ */}

                        <aside className="lg:col-span-4 space-y-4">

                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Profile Summary
                                </h3>

                                <span className="text-[10px] font-semibold text-slate-400">
                                    {[
                                        isStep1Done,
                                        isStep2Done,
                                        isStep3Done,
                                        isStep4Done,
                                    ].filter(Boolean).length}
                                    /4 complete
                                </span>
                            </div>

                            {/* PROFILE */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {form.profilePhotoData ||
                                            form.avatar ? (
                                            <img
                                                src={
                                                    form.profilePhotoData ||
                                                    form.avatar
                                                }
                                                alt="Employee profile"
                                                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <User size={25} />
                                            </div>
                                        )}

                                        {isStep1Done && (
                                            <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                                <CheckCircle2
                                                    size={12}
                                                    className="text-white"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">
                                            {form.firstName ||
                                                form.lastName
                                                ? `${form.firstName} ${form.lastName}`
                                                : "New Employee"}
                                        </p>

                                        <p className="text-[11px] text-slate-400 truncate">
                                            {form.email ||
                                                "Employee profile"}
                                        </p>

                                        {form.employeeId && (
                                            <span className="inline-flex mt-1 text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                                                {form.employeeId}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <SummaryCard
                                icon={User}
                                title="Personal Info"
                                active={currentStep === 1}
                                status={
                                    isStep1Done
                                        ? "Done"
                                        : "In progress"
                                }
                            >
                                <SummaryRow
                                    label="Name"
                                    value={
                                        form.firstName ||
                                            form.lastName
                                            ? `${form.firstName} ${form.lastName}`
                                            : ""
                                    }
                                />

                                <SummaryRow
                                    label="Email"
                                    value={form.email}
                                />

                                <SummaryRow
                                    label="Phone"
                                    value={form.phone}
                                />

                                <SummaryRow
                                    label="Gender"
                                    value={form.gender}
                                />
                            </SummaryCard>

                            <SummaryCard
                                icon={Briefcase}
                                title="Job Details"
                                active={currentStep === 2}
                                status={
                                    isStep2Done
                                        ? "Done"
                                        : "Pending"
                                }
                            >
                                <SummaryRow
                                    label="Designation"
                                    value={selectedDesignation}
                                />

                                <SummaryRow
                                    label="Department"
                                    value={selectedDepartment}
                                />

                                <SummaryRow
                                    label="Employment"
                                    value={form.employmentType}
                                />

                                <SummaryRow
                                    label="Status"
                                    value={form.employeeStatus}
                                />

                                <SummaryRow
                                    label="Joining"
                                    value={form.dateOfJoining}
                                />
                            </SummaryCard>

                            <SummaryCard
                                icon={FileText}
                                title="Documents"
                                active={currentStep === 3}
                                status={
                                    isStep3Done
                                        ? "Done"
                                        : "Pending"
                                }
                            >
                                <SummaryRow
                                    label="National ID Type"
                                    value={form.nationalIdType}
                                />

                                <SummaryRow
                                    label="National ID"
                                    value={form.nationalId}
                                />

                                <SummaryRow
                                    label="ID Front"
                                    value={
                                        form.nationalIdFrontFileName
                                            ? "Uploaded"
                                            : ""
                                    }
                                />

                                <SummaryRow
                                    label="ID Back"
                                    value={
                                        form.nationalIdBackFileName
                                            ? "Uploaded"
                                            : ""
                                    }
                                />

                                <SummaryRow
                                    label="Photo"
                                    value={
                                        form.passportPhotoFileName
                                            ? "Uploaded"
                                            : ""
                                    }
                                />
                            </SummaryCard>

                            <SummaryCard
                                icon={Landmark}
                                title="Banking Info"
                                active={currentStep === 4}
                                status={
                                    isStep4Done
                                        ? "Done"
                                        : "Pending"
                                }
                            >
                                <SummaryRow
                                    label="Account Name"
                                    value={form.accountName}
                                />

                                <SummaryRow
                                    label="Bank"
                                    value={form.bankName}
                                />

                                <SummaryRow
                                    label="Account"
                                    value={
                                        form.accountNumber
                                            ? `•••• ${form.accountNumber.slice(-4)}`
                                            : ""
                                    }
                                />
                            </SummaryCard>
                        </aside>

                        {/* ============================================================ */}
                        {/* FORM PANEL                                                    */}
                        {/* ============================================================ */}

                        <main className="lg:col-span-8">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 sm:p-7">

                                {/* ======================================================== */}
                                {/* STEP 1                                                     */}
                                {/* ======================================================== */}

                                {currentStep === 1 && (
                                    <div className="space-y-6">

                                        <SectionTitle
                                            title="Personal Information"
                                            description="Basic identity and profile information of the employee."
                                        />

                                        {/* PROFILE PHOTO */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                                <div className="relative shrink-0">
                                                    {form.profilePhotoData ||
                                                        form.avatar ? (
                                                        <img
                                                            src={
                                                                form.profilePhotoData ||
                                                                form.avatar
                                                            }
                                                            alt="Employee"
                                                            className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                                            <Camera size={28} />
                                                        </div>
                                                    )}

                                                    {form.profilePhotoData && (
                                                        <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                                            <CheckCircle2
                                                                size={14}
                                                                className="text-white"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-900">
                                                        Passport Size Profile Photo
                                                    </p>

                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Upload a clear professional photo.
                                                        This photo will also appear in the employee profile.
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                passportPhotoRef.current?.click()
                                                            }
                                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                                                        >
                                                            <Camera size={15} />
                                                            {form.profilePhotoData
                                                                ? "Change Photo"
                                                                : "Upload Photo"}
                                                        </button>

                                                        {form.profilePhotoData && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeFile(
                                                                        "profilePhotoData",
                                                                        "profilePhotoFileName"
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-bold"
                                                            >
                                                                <Trash2 size={14} />
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <p className="text-[10px] text-slate-400 mt-2">
                                                        JPG, PNG, WEBP · maximum 10MB
                                                    </p>

                                                    {form.profilePhotoFileName && (
                                                        <p className="text-[11px] text-emerald-600 font-semibold mt-2">
                                                            {form.profilePhotoFileName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <input
                                                ref={passportPhotoRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleProfilePhoto}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* NAME */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            <div>
                                                <label className="field-label">
                                                    First Name
                                                    <span className="text-red-500">*</span>
                                                </label>

                                                <input
                                                    name="firstName"
                                                    value={form.firstName}
                                                    onChange={handleChange}
                                                    placeholder="Enter first name"
                                                    className={
                                                        duplicateErrors.name
                                                            ? errorInputClass
                                                            : inputClass
                                                    }
                                                />

                                                {/* NAME DUPLICATE RED MESSAGE */}
                                                {duplicateErrors.name && (
                                                    <FieldError>
                                                        {duplicateErrors.name}
                                                    </FieldError>
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Last Name
                                                    <span className="text-red-500">*</span>
                                                </label>

                                                <input
                                                    name="lastName"
                                                    value={form.lastName}
                                                    onChange={handleChange}
                                                    placeholder="Enter last name"
                                                    className={
                                                        duplicateErrors.name
                                                            ? errorInputClass
                                                            : inputClass
                                                    }
                                                />

                                                {duplicateErrors.name && (
                                                    <FieldError>
                                                        {duplicateErrors.name}
                                                    </FieldError>
                                                )}
                                            </div>
                                        </div>

                                        {/* EMAIL */}
                                        <div>
                                            <label className="field-label">
                                                Email Address
                                                <span className="text-red-500">*</span>
                                            </label>

                                            <div className="relative">
                                                <Mail
                                                    size={16}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                    placeholder="employee@company.com"
                                                    className={`${duplicateErrors.email
                                                        ? errorInputClass
                                                        : inputClass
                                                        } pl-11`}
                                                />
                                            </div>

                                            {duplicateErrors.email && (
                                                <FieldError>
                                                    {duplicateErrors.email}
                                                </FieldError>
                                            )}
                                        </div>

                                        {/* PHONE */}
                                        <div>
                                            <label className="field-label">
                                                Phone Number
                                            </label>

                                            <div className="flex">
                                                <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-bold text-slate-600">
                                                    IN +91
                                                </div>

                                                <div className="relative flex-1">
                                                    <Phone
                                                        size={15}
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                    />

                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={form.phone}
                                                        onChange={handleChange}
                                                        placeholder="9876543210"
                                                        className={`${duplicateErrors.phone
                                                            ? errorInputClass
                                                            : inputClass
                                                            } pl-9 rounded-l-none`}
                                                    />
                                                </div>
                                            </div>

                                            {duplicateErrors.phone && (
                                                <FieldError>
                                                    {duplicateErrors.phone}
                                                </FieldError>
                                            )}
                                        </div>

                                        {/* GENDER */}
                                        <div>
                                            <label className="field-label">
                                                Gender
                                            </label>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {GENDER_OPTIONS.map((gender) => (
                                                    <label
                                                        key={gender.value}
                                                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${form.gender === gender.value
                                                            ? "border-indigo-500 bg-indigo-50"
                                                            : "border-slate-200 bg-white hover:border-indigo-200"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-800">
                                                                {gender.label}
                                                            </span>

                                                            <input
                                                                type="radio"
                                                                name="gender"
                                                                value={gender.value}
                                                                checked={
                                                                    form.gender ===
                                                                    gender.value
                                                                }
                                                                onChange={handleChange}
                                                                className="accent-indigo-600"
                                                            />
                                                        </div>

                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {gender.sub}
                                                        </p>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* LOCATION */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPin
                                                    size={15}
                                                    className="text-indigo-600"
                                                />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Address
                                                </span>
                                            </div>

                                            <textarea
                                                name="address"
                                                value={form.address}
                                                onChange={handleChange}
                                                rows={3}
                                                placeholder="Employee address"
                                                className={`${inputClass} resize-none`}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <input
                                                    name="city"
                                                    value={form.city}
                                                    onChange={handleChange}
                                                    placeholder="City"
                                                    className={inputClass}
                                                />

                                                <input
                                                    name="state"
                                                    value={form.state}
                                                    onChange={handleChange}
                                                    placeholder="State"
                                                    className={inputClass}
                                                />

                                                <input
                                                    name="pincode"
                                                    value={form.pincode}
                                                    onChange={handleChange}
                                                    placeholder="Pincode"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ======================================================== */}
                                {/* STEP 2                                                     */}
                                {/* ======================================================== */}

                                {currentStep === 2 && (
                                    <div className="space-y-6">

                                        <SectionTitle
                                            title="Job Details"
                                            description="Role, department, employment status and compensation details."
                                        />

                                        {/* DESIGNATION + STATUS */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            <div>
                                                <label className="field-label">
                                                    Designation
                                                    <span className="text-red-500">*</span>
                                                </label>

                                                <select
                                                    name="designation"
                                                    value={form.designation}
                                                    onChange={handleChange}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Select Designation
                                                    </option>

                                                    {designationOptions.map(
                                                        (item) => (
                                                            <option
                                                                key={item.value}
                                                                value={item.value}
                                                            >
                                                                {item.label}
                                                            </option>
                                                        )
                                                    )}

                                                    <option value="Other">
                                                        + Add Other Designation
                                                    </option>
                                                </select>

                                                {form.designation === "Other" && (
                                                    <input
                                                        name="designationOther"
                                                        value={form.designationOther}
                                                        onChange={handleChange}
                                                        placeholder="Enter designation"
                                                        className={`${inputClass} mt-2`}
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Employee Status
                                                </label>

                                                <select
                                                    name="employeeStatus"
                                                    value={form.employeeStatus}
                                                    onChange={handleChange}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    {EMPLOYEE_STATUS_OPTIONS.map(
                                                        (status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {status}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* DEPARTMENT + EMPLOYMENT */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            <div>
                                                <label className="field-label">
                                                    Department
                                                    <span className="text-red-500">*</span>
                                                </label>

                                                <select
                                                    name="department"
                                                    value={form.department}
                                                    onChange={handleChange}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Select Department
                                                    </option>

                                                    {departmentOptions.map(
                                                        (item) => (
                                                            <option
                                                                key={item.value}
                                                                value={item.value}
                                                            >
                                                                {item.label}
                                                            </option>
                                                        )
                                                    )}

                                                    <option value="Other">
                                                        + Add Other Department
                                                    </option>
                                                </select>

                                                {form.department === "Other" && (
                                                    <input
                                                        name="departmentOther"
                                                        value={form.departmentOther}
                                                        onChange={handleChange}
                                                        placeholder="Enter department"
                                                        className={`${inputClass} mt-2`}
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Employment Type
                                                </label>

                                                <select
                                                    name="employmentType"
                                                    value={form.employmentType}
                                                    onChange={handleChange}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    {EMPLOYMENT_TYPES.map(
                                                        (type) => (
                                                            <option
                                                                key={type}
                                                                value={type}
                                                            >
                                                                {type}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* MANAGER + JOINING */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            <div>
                                                <label className="field-label">
                                                    Reporting Manager
                                                </label>

                                                <select
                                                    name="reportingManager"
                                                    value={form.reportingManager}
                                                    onChange={handleChange}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Select Reporting Manager
                                                    </option>

                                                    {REPORTING_MANAGER_OPTIONS.map((manager) => (
                                                        <option key={manager} value={manager}>
                                                            {manager}
                                                        </option>
                                                    ))}

                                                    <option value="Other">
                                                        + Add Reporting Manager
                                                    </option>
                                                </select>

                                                {form.reportingManager === "Other" && (
                                                    <input
                                                        name="reportingManagerOther"
                                                        value={form.reportingManagerOther}
                                                        onChange={handleChange}
                                                        placeholder="Enter reporting manager name"
                                                        className={`${inputClass} mt-3`}
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Joining Date
                                                </label>

                                                <div className="relative">
                                                    <CalendarDays
                                                        size={15}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                    />

                                                    <input
                                                        type="date"
                                                        name="dateOfJoining"
                                                        value={form.dateOfJoining}
                                                        onChange={handleChange}
                                                        className={`${inputClass} pl-10`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SALARY */}
                                        <div>
                                            <label className="field-label">
                                                Monthly Salary
                                            </label>

                                            <div className="relative">
                                                <IndianRupee
                                                    size={15}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <input
                                                    type="number"
                                                    name="salary"
                                                    value={form.salary}
                                                    onChange={handleChange}
                                                    placeholder="50000"
                                                    className={`${inputClass} pl-10`}
                                                />
                                            </div>
                                        </div>

                                        {/* JOB INFO BOX */}
                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                                            <div className="flex gap-3">
                                                <BadgeCheck
                                                    size={18}
                                                    className="text-indigo-600 shrink-0"
                                                />

                                                <div>
                                                    <p className="text-xs font-bold text-indigo-900">
                                                        Professional Job Profile
                                                    </p>

                                                    <p className="text-[11px] text-indigo-700/70 mt-1">
                                                        Designation, department, reporting manager,
                                                        employment type, status and salary are all
                                                        stored in the employee profile.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ======================================================== */}
                                {/* STEP 3                                                     */}
                                {/* ======================================================== */}

                                {currentStep === 3 && (
                                    <div className="space-y-6">

                                        <SectionTitle
                                            title="Documents"
                                            description="Identification numbers and scanned copies."
                                        />

                                        {/* NATIONAL ID */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <CreditCard size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            National ID Card
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            Select the document type and upload its front and back images.
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full self-start sm:self-auto">
                                                    Image only · Max 10MB
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="field-label">
                                                        ID Type
                                                    </label>
                                                    <select
                                                        name="nationalIdType"
                                                        value={form.nationalIdType}
                                                        onChange={handleChange}
                                                        className={`${inputClass} cursor-pointer`}
                                                    >
                                                        {NATIONAL_ID_OPTIONS.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="field-label">
                                                        {form.nationalIdType} Number
                                                    </label>
                                                    <input
                                                        name="nationalId"
                                                        value={form.nationalId}
                                                        onChange={handleChange}
                                                        placeholder={`Enter ${form.nationalIdType} number`}
                                                        className={`${inputClass} font-mono uppercase`}
                                                    />
                                                </div>
                                            </div>

                                            {form.nationalIdType === "Other Official ID" && (
                                                <div className="mb-4">
                                                    <label className="field-label">
                                                        Other Official ID Name
                                                    </label>
                                                    <input
                                                        name="nationalIdOther"
                                                        value={form.nationalIdOther}
                                                        onChange={handleChange}
                                                        placeholder="Enter official ID name"
                                                        className={inputClass}
                                                    />
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <UploadCard
                                                    title={`${form.nationalIdType} - Front Side`}
                                                    subtitle="Click to upload front image"
                                                    fileName={form.nationalIdFrontFileName}
                                                    preview={
                                                        form.nationalIdFrontFileData?.startsWith("data:image")
                                                            ? form.nationalIdFrontFileData
                                                            : ""
                                                    }
                                                    onClick={() => frontIdRef.current?.click()}
                                                    onRemove={() =>
                                                        removeFile(
                                                            "nationalIdFrontFileData",
                                                            "nationalIdFrontFileName"
                                                        )
                                                    }
                                                />

                                                <UploadCard
                                                    title={`${form.nationalIdType} - Back Side`}
                                                    subtitle="Click to upload back image"
                                                    fileName={form.nationalIdBackFileName}
                                                    preview={
                                                        form.nationalIdBackFileData?.startsWith("data:image")
                                                            ? form.nationalIdBackFileData
                                                            : ""
                                                    }
                                                    onClick={() => backIdRef.current?.click()}
                                                    onRemove={() =>
                                                        removeFile(
                                                            "nationalIdBackFileData",
                                                            "nationalIdBackFileName"
                                                        )
                                                    }
                                                />
                                            </div>

                                            <input
                                                ref={frontIdRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) =>
                                                    handleDocumentUpload(
                                                        e,
                                                        "nationalIdFrontFileData",
                                                        "nationalIdFrontFileName",
                                                        true
                                                    )
                                                }
                                                className="hidden"
                                            />

                                            <input
                                                ref={backIdRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) =>
                                                    handleDocumentUpload(
                                                        e,
                                                        "nationalIdBackFileData",
                                                        "nationalIdBackFileName",
                                                        true
                                                    )
                                                }
                                                className="hidden"
                                            />
                                        </div>

                                        {/* PASSPORT PHOTO */}
                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">

                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center border border-indigo-100">
                                                    <ImageIcon size={17} />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        Passport Size Photo
                                                    </p>

                                                    <p className="text-[11px] text-slate-500">
                                                        This image will be used as the employee profile photo.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5 items-center">

                                                <div className="w-[150px] h-[180px] rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                                    {form.passportPhotoData ? (
                                                        <img
                                                            src={
                                                                form.passportPhotoData
                                                            }
                                                            alt="Passport size"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Camera
                                                                size={28}
                                                                className="mx-auto text-slate-300"
                                                            />

                                                            <p className="text-[10px] text-slate-400 mt-2">
                                                                No photo
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            passportPhotoRef.current?.click()
                                                        }
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                                                    >
                                                        <Upload size={15} />
                                                        Upload Passport Photo
                                                    </button>

                                                    {form.passportPhotoData && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                removeFile(
                                                                    "passportPhotoData",
                                                                    "passportPhotoFileName"
                                                                );

                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    avatar: "",
                                                                    profilePhotoData: "",
                                                                    profilePhotoFileName: "",
                                                                }));
                                                            }}
                                                            className="ml-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-xs font-bold"
                                                        >
                                                            <Trash2 size={14} />
                                                            Remove
                                                        </button>
                                                    )}

                                                    <p className="text-[10px] text-slate-400 mt-3">
                                                        JPG, PNG or WEBP · maximum 10MB
                                                    </p>

                                                    {form.passportPhotoFileName && (
                                                        <p className="text-[11px] font-semibold text-emerald-600 mt-2">
                                                            {form.passportPhotoFileName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ======================================================== */}
                                {/* STEP 4                                                     */}
                                {/* ======================================================== */}

                                {currentStep === 4 && (
                                    <div className="space-y-6">

                                        <SectionTitle
                                            title="Banking Information"
                                            description="Bank account details for salary payments."
                                        />

                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <Landmark size={18} />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        Salary Account
                                                    </p>

                                                    <p className="text-[11px] text-slate-400">
                                                        Enter the employee's salary receiving account.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                                <div>
                                                    <label className="field-label">
                                                        Account Name
                                                    </label>

                                                    <input
                                                        name="accountName"
                                                        value={form.accountName}
                                                        onChange={handleChange}
                                                        placeholder="Account holder name"
                                                        className={inputClass}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="field-label">
                                                        Bank Name
                                                    </label>

                                                    <input
                                                        name="bankName"
                                                        value={form.bankName}
                                                        onChange={handleChange}
                                                        placeholder="Bank name"
                                                        className={inputClass}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="field-label">
                                                        Branch Name
                                                    </label>

                                                    <input
                                                        name="branchName"
                                                        value={form.branchName}
                                                        onChange={handleChange}
                                                        placeholder="Branch name"
                                                        className={inputClass}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="field-label">
                                                        Account Number
                                                    </label>

                                                    <input
                                                        name="accountNumber"
                                                        value={form.accountNumber}
                                                        onChange={handleChange}
                                                        placeholder="Account number"
                                                        className={`${inputClass} font-mono`}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="field-label">
                                                        IFSC Code
                                                    </label>

                                                    <input
                                                        name="ifscCode"
                                                        value={form.ifscCode}
                                                        onChange={handleChange}
                                                        placeholder="SBIN0000000"
                                                        className={`${inputClass} font-mono uppercase`}
                                                    />
                                                </div>

                                            </div>
                                        </div>

                                        {/* FINAL PROFILE PREVIEW */}
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                                            <div className="flex items-center gap-3">
                                                {form.profilePhotoData ? (
                                                    <img
                                                        src={form.profilePhotoData}
                                                        alt="Employee"
                                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600">
                                                        <User size={23} />
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-sm font-bold text-emerald-900">
                                                        Profile Ready
                                                    </p>

                                                    <p className="text-[11px] text-emerald-700/70 mt-0.5">
                                                        Review the information and click Save Employee.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ======================================================== */}
                                {/* FOOTER                                                     */}
                                {/* ======================================================== */}

                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 mt-8 border-t border-slate-200">

                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <div className="flex items-center gap-2">

                                        {currentStep > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCurrentStep(
                                                        (prev) => prev - 1
                                                    )
                                                }
                                                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                                            >
                                                Back
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            disabled={loading}
                                            className="inline-flex items-center justify-center gap-2 min-w-[130px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2
                                                        size={15}
                                                        className="animate-spin"
                                                    />
                                                    Saving...
                                                </>
                                            ) : currentStep === 4 ? (
                                                <>
                                                    <Save size={15} />
                                                    Save Employee
                                                </>
                                            ) : (
                                                <>
                                                    Continue
                                                    <ChevronRight size={15} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            {/* Small reusable label styles */}
            <style jsx>{`
        .field-label {
          display: block;
          margin-bottom: 7px;
          font-size: 11px;
          line-height: 1;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      `}</style>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AddEmployeePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[500px] flex items-center justify-center">
                    <Loader2
                        size={32}
                        className="animate-spin text-indigo-600"
                    />
                </div>
            }
        >
            <EmployeeFormContent />
        </Suspense>
    );
}