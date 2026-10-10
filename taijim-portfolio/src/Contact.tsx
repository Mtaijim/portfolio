import { useRef, useState, type FormEvent } from "react";
import { CFG } from "./data";
import { AsciiText } from "./ascii";
import { useSceneFade } from "./hooks";

/** Final scene: social links + contact form. */
export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  useSceneFade(ref, [0.92, 0.97]);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { name, email, message } = Object.fromEntries(
      new FormData(form),
    ) as Record<string, string>;

    if (!CFG.form) {
      // No form service configured: open the visitor's email app with the message filled in
      const body = `${message}\n\n— ${name} (${email})`;
      location.href = `${CFG.email}?subject=${encodeURIComponent("Hello from " + name)}&body=${encodeURIComponent(body)}`;
      return setStatus("Opening your email app…");
    }
    setStatus("Sending…");
    try {
      const res = await fetch(CFG.form, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("failed");
      form.reset();
      setStatus("Message sent. Thank you.");
    } catch {
      setStatus("Could not send — please use the email link.");
    }
  }

  return (
    <section
      id="contact"
      data-lenis-prevent
      ref={ref}
      className="fx"
      aria-label="Contact"
    >
      <div>
        <div id="cname" className="asc" role="img" aria-label="M. TAIJIM">
          <AsciiText text="M. TAIJIM" className="cch" />
        </div>
        <h2>LET'S BUILD.</h2>
        <nav aria-label="Social links">
          <a href={CFG.github} target="_blank" rel="noopener">
            GitHub
          </a>
          <a href={CFG.linkedin} target="_blank" rel="noopener">
            LinkedIn
          </a>
          <a href={CFG.twitter} target="_blank" rel="noopener">
            Twitter / X
          </a>
          <a href={CFG.email}>Email</a>
        </nav>
      </div>
      <form id="cf" autoComplete="on" onSubmit={send}>
        <div>
          <label htmlFor="fn">Name</label>
          <input id="fn" name="name" required />
        </div>
        <div>
          <label htmlFor="fe">Email</label>
          <input id="fe" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="fm">Message</label>
          <textarea id="fm" name="message" required></textarea>
        </div>
        <button type="submit">Send message →</button>
        <p id="st" className="mono" role="status" aria-live="polite">
          {status}
        </p>
      </form>
    </section>
  );
}
