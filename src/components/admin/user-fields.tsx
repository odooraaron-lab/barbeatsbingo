import { toDateInput } from "@/lib/format";

type Values = {
  name?: string;
  email?: string;
  venue?: string;
  phone?: string;
  notes?: string;
  role?: "admin" | "member";
  accessExpiresAt?: Date | null;
};

export function UserFields({ values = {} }: { values?: Values }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Contact name
          </label>
          <input id="name" name="name" className="field" defaultValue={values.name} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="venue" className="label">
            Venue or business
          </label>
          <input id="venue" name="venue" className="field" defaultValue={values.venue} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email (used to log in)
          </label>
          <input id="email" name="email" type="email" required className="field" defaultValue={values.email} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className="field" defaultValue={values.phone} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="accessExpiresAt" className="label">
            Access ends
          </label>
          <input
            id="accessExpiresAt"
            name="accessExpiresAt"
            type="date"
            className="field"
            defaultValue={toDateInput(values.accessExpiresAt)}
          />
          <p className="hint">Leave empty for ongoing access.</p>
        </div>
        <div>
          <label htmlFor="role" className="label">
            Account type
          </label>
          <select id="role" name="role" className="field" defaultValue={values.role ?? "member"}>
            <option value="member">Customer</option>
            <option value="admin">Admin (can manage everything)</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="label">
          Private notes
        </label>
        <textarea id="notes" name="notes" className="field !min-h-24" defaultValue={values.notes} />
        <p className="hint">Only admins can see these.</p>
      </div>
    </>
  );
}
