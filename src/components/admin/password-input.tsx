"use client";

import { useState } from "react";

// Avoids characters that are easy to confuse when read out or copied.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generate(length = 14) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function PasswordInput({ id = "password", name = "password" }: { id?: string; name?: string }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        className="field font-mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm shrink-0 self-center"
        onClick={() => {
          setValue(generate());
          setVisible(true);
        }}
      >
        Generate
      </button>
    </div>
  );
}
