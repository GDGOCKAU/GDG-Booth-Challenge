import React from "react";

export default function StatusBadge({ children, tone = "info" }) { return <span className={`status-badge ${tone}`}><i />{children}</span>; }
