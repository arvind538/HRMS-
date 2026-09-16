"use client";

import React, { useRef } from "react";
import { Printer, X, Building2 } from "lucide-react";
import "./OfferLetterModal.css";

export default function OfferLetterModal({ offer, isOpen, onClose }) {
    const printRef = useRef(null);

    if (!isOpen || !offer) return null;

    const candidateName = offer.candidate?.name || "Candidate Name";
    const candidateEmail = offer.candidate?.email || "candidate@email.com";
    const designation = offer.designation || "Software Engineer";
    const monthlySalary = Number(offer.offeredSalary) || 0;
    const annualSalary = monthlySalary * 12;
    const joiningDate = offer.joiningDate
        ? new Date(offer.joiningDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : "Immediate";
    const issueDate = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const basicSalary = Math.round(monthlySalary * 0.5);
    const hra = Math.round(monthlySalary * 0.3);
    const specialAllowance = Math.round(monthlySalary * 0.2);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="offer-overlay">
            {/* 1. Sticky Top Navigation Bar */}
            <div className="offer-topbar no-print">
                <div className="offer-topbar-left">
                    <span className="offer-icon-badge">
                        <Building2 size={20} />
                    </span>
                    <div>
                        <h2 className="offer-topbar-title">Official Offer Letter Preview</h2>
                        <p className="offer-topbar-subtitle">4paysave Hi Tech Solution • Corporate Proposal</p>
                    </div>
                </div>

                <div className="offer-topbar-actions">
                    <button onClick={handlePrint} className="offer-btn-print">
                        <Printer size={15} />
                        <span>Print / Download PDF</span>
                    </button>
                    <button onClick={onClose} className="offer-btn-close">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* 2. Scrollable Canvas Area */}
            <div className="offer-canvas-wrapper">
                {/* A4 Paper Canvas */}
                <div ref={printRef} id="printable-offer-letter" className="offer-paper">
                    {/* Content Area */}
                    <div>
                        {/* Header Letterhead */}
                        <div className="avoid-break offer-header">
                            <div>
                                <h1 className="offer-company-name">4paysave Hi Tech Solution</h1>
                                <p className="offer-company-tagline">Empowering Next-Gen FinTech & Enterprise Solutions</p>
                                <p className="offer-company-address">
                                    Corporate Office: Jaipur, Rajasthan, India | contact@4paysave.com
                                </p>
                            </div>
                            <div className="offer-header-right">
                                <span className="offer-ref-badge">
                                    REF: 4PS/HR/2026/0{offer._id ? offer._id.slice(-4).toUpperCase() : "7721"}
                                </span>
                                <p className="offer-issue-date">Date: {issueDate}</p>
                            </div>
                        </div>

                        {/* Candidate Info Card */}
                        <div className="avoid-break offer-candidate-card">
                            <div>
                                <p className="offer-label">Recipient Candidate</p>
                                <p className="offer-candidate-name">{candidateName}</p>
                                <p className="offer-candidate-email">{candidateEmail}</p>
                            </div>
                            <div>
                                <span className="offer-status-badge">Official Proposal</span>
                            </div>
                        </div>

                        {/* Subject & Body */}
                        <div className="avoid-break offer-body">
                            <p className="offer-subject">
                                Subject: Letter of Offer & Appointment for the position of "{designation}"
                            </p>
                            <p>
                                Dear <span className="offer-strong-dark">{candidateName}</span>,
                            </p>
                            <p className="offer-paragraph">
                                Following your recent interviews and interactions with us, we are pleased to offer you the position
                                of <strong className="offer-strong-dark">{designation}</strong> with{" "}
                                <strong className="offer-strong-brand">4paysave Hi Tech Solution</strong>. We believe your skills and
                                dynamic approach will significantly contribute to our technology and business roadmap.
                            </p>
                        </div>

                        {/* Terms & Clauses */}
                        <div className="offer-clauses">
                            <div className="avoid-break offer-clause">
                                <span className="offer-clause-num">1.</span>
                                <p>
                                    <strong>Date of Joining:</strong> Your scheduled reporting date will be{" "}
                                    <strong className="offer-highlight">{joiningDate}</strong>.
                                </p>
                            </div>

                            <div className="avoid-break offer-clause">
                                <span className="offer-clause-num">2.</span>
                                <p>
                                    <strong>Remuneration & Compensation:</strong> Your Annual Cost to Company (CTC) will be fixed at{" "}
                                    <strong className="offer-strong-brand">₹{annualSalary.toLocaleString("en-IN")}</strong> (Rupees{" "}
                                    {annualSalary.toLocaleString("en-IN")} only), payable monthly at{" "}
                                    <strong className="offer-strong-brand">₹{monthlySalary.toLocaleString("en-IN")}</strong> per month
                                    subject to statutory tax deductions.
                                </p>
                            </div>

                            <div className="avoid-break offer-clause">
                                <span className="offer-clause-num">3.</span>
                                <p>
                                    <strong>Probation Period:</strong> You will remain on probation for{" "}
                                    <strong>{offer.probationMonths || 3} Months</strong> from the date of joining.
                                </p>
                            </div>

                            <div className="avoid-break offer-clause">
                                <span className="offer-clause-num">4.</span>
                                <p>
                                    <strong>Operating Location:</strong> Your primary operating location will be at the corporate
                                    headquarters of 4paysave Hi Tech Solution in Jaipur.
                                </p>
                            </div>
                        </div>

                        {/* Annexure A: Compensation Table */}
                        <div className="avoid-break offer-annexure">
                            <div className="offer-annexure-head">
                                <p className="offer-annexure-title">ANNEXURE - A : COMPENSATION & STRUCTURE DETAILS</p>
                                <span className="offer-annexure-currency">Currency: INR (₹)</span>
                            </div>
                            <div className="offer-table-wrap">
                                <table className="offer-table">
                                    <thead>
                                        <tr>
                                            <th>SALARY BREAKDOWN COMPONENTS</th>
                                            <th className="text-right">MONTHLY (₹)</th>
                                            <th className="text-right">ANNUALIZED (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="offer-td-label">Basic Pay Component (50%)</td>
                                            <td className="text-right">₹{basicSalary.toLocaleString("en-IN")}</td>
                                            <td className="text-right">₹{(basicSalary * 12).toLocaleString("en-IN")}</td>
                                        </tr>
                                        <tr>
                                            <td className="offer-td-label">House Rent Allowance - HRA (30%)</td>
                                            <td className="text-right">₹{hra.toLocaleString("en-IN")}</td>
                                            <td className="text-right">₹{(hra * 12).toLocaleString("en-IN")}</td>
                                        </tr>
                                        <tr>
                                            <td className="offer-td-label">Special / Performance Allowance (20%)</td>
                                            <td className="text-right">₹{specialAllowance.toLocaleString("en-IN")}</td>
                                            <td className="text-right">₹{(specialAllowance * 12).toLocaleString("en-IN")}</td>
                                        </tr>
                                        <tr className="offer-total-row">
                                            <td>Total Guaranteed CTC</td>
                                            <td className="text-right">₹{monthlySalary.toLocaleString("en-IN")}</td>
                                            <td className="text-right offer-total-annual">₹{annualSalary.toLocaleString("en-IN")}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Signatures & Footer Section */}
                    <div className="avoid-break offer-footer">
                        <p className="offer-confirm-text">
                            Please confirm your acceptance of this appointment offer by counter-signing this formal letter within 3
                            calendar business days.
                        </p>

                        <div className="offer-signatures">
                            {/* Company Sign */}
                            <div>
                                <p className="offer-sign-title">For 4paysave Hi Tech Solution</p>
                                <div className="offer-sign-mark">
                                    <span className="offer-sign-authorized">Authorized Signatory</span>
                                </div>
                                <div className="offer-sign-info">
                                    <p className="offer-sign-role">Director / Head of HR</p>
                                    <p>Human Resources & Talent Management</p>
                                </div>
                            </div>

                            {/* Candidate Sign */}
                            <div>
                                <p className="offer-sign-title">Candidate Acceptance</p>
                                <div className="offer-sign-mark offer-sign-placeholder">
                                    Signature: __________________________
                                </div>
                                <div className="offer-sign-info">
                                    <p className="offer-sign-role">{candidateName}</p>
                                    <p>Date: _____ / _____ / 2026</p>
                                </div>
                            </div>
                        </div>

                        <div className="offer-bottom-line">
                            4paysave Hi Tech Solution • Confidential Document • Jaipur, Rajasthan
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}