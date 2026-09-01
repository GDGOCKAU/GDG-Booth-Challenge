import React, { useRef, useState } from "react";
import { api } from "../api";
import { CloseIcon } from "./Icons";
import ErrorBanner from "./ErrorBanner";
import LoadingDots from "./LoadingDots";

const types = ["multiple_choice", "multiple_select", "short_answer", "code_output", "code_fix", "image", "true_false"];
const difficulties = ["Easy", "Medium", "Hard", "Impossible"];
const imageDefaults = ["AI generated", "Real"];
const maxImageBytes = 8 * 1024 * 1024;
const maxImageEdge = 1600;

const blankQuestion = {
  title: "",
  description: "",
  type: "multiple_choice",
  category: "General",
  difficulty: "Easy",
  points: 10,
  maxAttempts: 1,
  penalty: 0,
  explanation: "",
  isActive: true,
  content: { options: ["", ""] },
  answer: { correct: "0" },
};

const pretty = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function initialForm(question) {
  const next = structuredClone(question || blankQuestion);
  if (next.type === "image" && !next.content?.options?.length) {
    next.content = { ...next.content, options: [...imageDefaults] };
  }
  return next;
}

function normalizeImageUrl(value) {
  const url = String(value || "").trim();
  if (!url || /^(data:|blob:|https?:\/\/|\/)/i.test(url)) return url;
  return `https://${url}`;
}

function prepareImage(file) {
  if (!file?.type.startsWith("image/")) return Promise.reject(new Error("Choose a PNG, JPG, WebP, GIF, or another image file."));
  if (file.size > maxImageBytes) return Promise.reject(new Error("The image must be smaller than 8 MB."));

  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not prepare this image.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.86));
      } catch (reason) {
        reject(reason);
      } finally {
        URL.revokeObjectURL(source);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("This image could not be opened. Try a different file."));
    };
    image.src = source;
  });
}

function Field({ label, children, hint }) {
  return <label className="admin-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="toggle-row"><button type="button" className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}><i /></button><span>{label}</span></label>;
}

function Modal({ title, onClose, onSave, saving, children }) {
  return <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="question-editor-title">
    <div className="form-modal">
      <div className="modal-header"><div><h2 id="question-editor-title">{title}</h2><p>Only fields relevant to this question type are shown.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><CloseIcon /></button></div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="primary-button" onClick={onSave} disabled={saving}>{saving ? <LoadingDots size={6} /> : "Save changes"}</button></div>
    </div>
  </div>;
}

export default function AdminQuestionForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const imageInput = useRef(null);
  const options = form.content?.options || [];

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateContent = (values) => setForm((current) => ({ ...current, content: { ...current.content, ...values } }));

  const setType = (type) => {
    setPreviewFailed(false);
    setForm((current) => {
      const base = { ...current, type };
      if (["multiple_choice", "multiple_select"].includes(type)) {
        base.content = { options: current.content?.options?.length ? current.content.options : ["", ""] };
        base.answer = type === "multiple_select" ? { correct: [] } : { correct: "0" };
      } else if (type === "true_false") {
        base.content = { options: ["true", "false"] };
        base.answer = { correct: "true" };
      } else if (type === "image") {
        base.content = { imageUrl: "", options: [...imageDefaults] };
        base.answer = { correct: "0" };
      } else if (["code_output", "code_fix"].includes(type)) {
        base.content = type === "code_fix" ? { language: "javascript", starterCode: "" } : { language: "javascript", code: "" };
        base.answer = { accepted: [""] };
      } else {
        base.content = {};
        base.answer = { accepted: [""], caseSensitive: false };
      }
      return base;
    });
  };

  const selectImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageBusy(true);
    setError("");
    setPreviewFailed(false);
    try {
      const imageUrl = await prepareImage(file);
      updateContent({ imageUrl });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setImageBusy(false);
    }
  };

  const updateOption = (index, value) => updateContent({ options: options.map((option, position) => position === index ? value : option) });
  const addOption = () => updateContent({ options: [...options, ""] });
  const removeOption = (index) => {
    if (options.length <= 2) return;
    setForm((current) => {
      const nextOptions = current.content.options.filter((_, position) => position !== index);
      const selected = current.answer?.correct;
      let nextCorrect;
      if (Array.isArray(selected)) {
        nextCorrect = selected.flatMap((item) => {
          const position = Number(item);
          if (position === index) return [];
          return [String(position > index ? position - 1 : position)];
        });
      } else {
        const position = Number(selected || 0);
        nextCorrect = String(position === index ? 0 : position > index ? position - 1 : position);
      }
      return { ...current, content: { ...current.content, options: nextOptions }, answer: { ...current.answer, correct: nextCorrect } };
    });
  };

  const save = async () => {
    setError("");
    if (!form.title.trim()) return setError("Question title is required.");
    if (["multiple_choice", "multiple_select", "image"].includes(form.type)) {
      if (options.length < 2 || options.some((option) => !String(option).trim())) return setError("Add at least two non-empty answer options.");
      if (form.type === "multiple_select" && !(form.answer?.correct || []).length) return setError("Select at least one correct answer.");
    }
    if (form.type === "image" && !form.content?.imageUrl) return setError("Add an image URL or choose an image with Browse.");

    setSaving(true);
    try {
      const payload = structuredClone(form);
      if (payload.type === "code_fix") payload.answer = { ...payload.answer, accepted: [(payload.answer?.accepted || []).join("\n")], caseSensitive: true };
      await api(`/api/admin/questions${initial ? `/${initial.id}` : ""}`, { method: initial ? "PUT" : "POST", body: JSON.stringify(payload) });
      onSaved();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={initial ? "Edit question" : "New question"} onClose={onClose} onSave={save} saving={saving}>
    <div className="form-grid">
      <Field label="Question title"><textarea className="text-input" rows="2" value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
      <Field label="Type"><select value={form.type} onChange={(event) => setType(event.target.value)}>{types.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></Field>
      <Field label="Description (optional)"><textarea className="text-input" rows="2" value={form.description} onChange={(event) => update("description", event.target.value)} /></Field>
      <div className="two-col"><Field label="Category"><input className="text-input" value={form.category} onChange={(event) => update("category", event.target.value)} /></Field><Field label="Difficulty"><select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></Field></div>

      {form.type === "image" && <Field label="Question image" hint="Paste a direct HTTPS image address, or choose a local image (up to 8 MB).">
        <div className="image-source-row"><input className="text-input" type="url" placeholder="https://example.com/image.jpg" value={form.content?.imageUrl || ""} onChange={(event) => { setPreviewFailed(false); updateContent({ imageUrl: event.target.value }); }} onBlur={(event) => updateContent({ imageUrl: normalizeImageUrl(event.target.value) })} /><button type="button" className="secondary-button image-browse-button" onClick={() => imageInput.current?.click()} disabled={imageBusy}>{imageBusy ? <LoadingDots size={5} /> : "Browse"}</button><input ref={imageInput} className="visually-hidden" type="file" accept="image/*" onChange={selectImage} /></div>
        {form.content?.imageUrl && <div className={`admin-image-preview ${previewFailed ? "failed" : ""}`}>{!previewFailed && <img src={normalizeImageUrl(form.content.imageUrl)} alt="Question preview" onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} />}{previewFailed && <p>Preview unavailable. Use a direct image file address, or upload the image with Browse.</p>}<button type="button" className="text-button danger-text" onClick={() => { updateContent({ imageUrl: "" }); setPreviewFailed(false); }}>Remove image</button></div>}
      </Field>}

      {["multiple_choice", "multiple_select", "image"].includes(form.type) && <>
        <Field label="Answer options" hint="Start with two options, then add or remove choices as needed.">
          {options.map((option, index) => <div className="option-editor" key={index}><input className="text-input" value={option} placeholder={`Option ${index + 1}`} onChange={(event) => updateOption(index, event.target.value)} /><button type="button" className="icon-button" onClick={() => removeOption(index)} disabled={options.length <= 2} aria-label={`Remove option ${index + 1}`} title={options.length <= 2 ? "At least two options are required" : "Remove option"}><CloseIcon /></button></div>)}
          <button type="button" className="text-button" onClick={addOption}>+ Add option</button>
        </Field>
        <Field label="Correct answer">{form.type === "multiple_select" ? <div className="choice-grid">{options.map((option, index) => { const key = String(index); const correct = form.answer?.correct || []; const checked = correct.includes(key); return <label key={key}><input type="checkbox" checked={checked} onChange={() => update("answer", { ...form.answer, correct: checked ? correct.filter((item) => item !== key) : [...correct, key] })} /> {option || `Option ${index + 1}`}</label>; })}</div> : <select value={form.answer?.correct || "0"} onChange={(event) => update("answer", { ...form.answer, correct: event.target.value })}>{options.map((option, index) => <option key={index} value={String(index)}>{option || `Option ${index + 1}`}</option>)}</select>}</Field>
      </>}

      {form.type === "true_false" && <Field label="Correct answer"><select value={form.answer?.correct || "true"} onChange={(event) => update("answer", { correct: event.target.value })}><option value="true">True</option><option value="false">False</option></select></Field>}
      {["short_answer", "code_output", "code_fix"].includes(form.type) && <>
        {["code_output", "code_fix"].includes(form.type) && <div className="two-col"><Field label="Language"><input className="text-input" value={form.content?.language || ""} onChange={(event) => updateContent({ language: event.target.value })} /></Field></div>}
        {form.type === "code_output" && <Field label="Code"><textarea className="code-editor compact" rows="6" value={form.content?.code || ""} onChange={(event) => updateContent({ code: event.target.value })} /></Field>}
        {form.type === "code_fix" && <Field label="Starter code"><textarea className="code-editor compact" rows="7" value={form.content?.starterCode || ""} onChange={(event) => updateContent({ starterCode: event.target.value })} /></Field>}
        <Field label="Accepted answers" hint="One accepted answer per line."><textarea className="text-input mono" rows="4" value={(form.answer?.accepted || []).join("\n")} onChange={(event) => update("answer", { ...form.answer, accepted: event.target.value.split("\n") })} /></Field>
        <Toggle label="Case-sensitive comparison" checked={Boolean(form.answer?.caseSensitive)} onChange={(value) => update("answer", { ...form.answer, caseSensitive: value })} />
      </>}

      <div className="three-col"><Field label="Points"><input className="text-input" type="number" min="0" value={form.points} onChange={(event) => update("points", event.target.value)} /></Field><Field label="Max attempts"><input className="text-input" type="number" min="1" value={form.maxAttempts} onChange={(event) => update("maxAttempts", event.target.value)} /></Field><Field label="Penalty / miss"><input className="text-input" type="number" min="0" value={form.penalty} onChange={(event) => update("penalty", event.target.value)} /></Field></div>
      <Field label="Explanation (optional)"><textarea className="text-input" rows="2" value={form.explanation} onChange={(event) => update("explanation", event.target.value)} /></Field>
      <Toggle label="Question is active" checked={form.isActive} onChange={(value) => update("isActive", value)} />
      <ErrorBanner message={error} />
    </div>
  </Modal>;
}
