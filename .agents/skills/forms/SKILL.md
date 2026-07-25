---
name: forms
description: "Build or change a form: TanStack Form + zod + the Field primitives, with the validator, error, focus and accessibility wiring that keeps a form from failing silently. Use when adding a form, adding a field, changing validation or error copy, or reviewing one."
source: local
---

# Forms

Every form is `@tanstack/react-form` + zod rendered through the `Field` primitives. Two upstream sources describe this and they disagree in one place, so this file reconciles them:

- [shadcn's TanStack Form guide](https://ui.shadcn.com/docs/forms/tanstack-form) owns the **composition**: `Field` / `FieldLabel` / `Input` / `FieldError`, `data-invalid` on the wrapper, `aria-invalid` on the control, `isTouched && !isValid`, a plain `form.handleSubmit()` with no `Subscribe`.
- [TanStack's validation guide](https://tanstack.com/form/latest/docs/framework/react/guides/validation) owns the **validator wiring**. Its canonical zod example is `validators: { onChange: schema }`, and it states plainly that errors from different sources accumulate: *"Since `field.state.meta.errors` is an array, all the relevant errors at a given time are displayed."*

Where they conflict, TanStack wins on the form API and shadcn wins on markup. The measured differences are recorded below.

## The shape

```tsx
const formSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(
      z.email({
        error: (issue) =>
          String(issue.input ?? "").trim() === ""
            ? "Enter your email address to join."
            : "That does not look like an email address. Check for a typo.",
      }),
    ),
})

const emailRef = useRef<HTMLInputElement>(null)

const form = useForm({
  defaultValues: { email: "" },
  validators: { onChange: formSchema },
  onSubmitInvalid: () => {
    if (emailRef.current) emailRef.current.focus()
  },
  onSubmit: ({ value }) => mutation.mutate(value),
})

<form
  onSubmit={(e) => {
    e.preventDefault()
    form.handleSubmit()
  }}
>
  <FieldGroup>
    <form.Field name="email">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
            <Input
              ref={emailRef}
              id={field.name}
              type="email"
              name={field.name}
              autoComplete="email"
              inputMode="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? `${field.name}-error` : undefined}
            />
            {isInvalid && (
              <FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
            )}
          </Field>
        )
      }}
    </form.Field>
  </FieldGroup>
  <Button type="submit" disabled={mutation.isPending}>
    {mutation.isPending && <Spinner />}
    Join the waitlist
  </Button>
</form>
```

## Rules

- **One validator source.** TanStack keeps one error per source, so registering the same schema on `onChange`, `onBlur` and `onSubmit` leaves a stale entry from the value at the last submit, and `FieldError` lists both. It hides while every source emits identical text and appears the moment two messages differ.
- **Use `onChange`.** It is TanStack's own canonical zod example, and it is the only single source that works here: with shadcn's `onSubmit` alone, a malformed value blocks submission without ever rendering a message, because the field is never marked touched, so `isInvalid` stays false and the visitor clicks submit and sees nothing happen. Dropping the `isTouched` guard does not rescue it. `onBlur` alone has the same hole for a field the visitor never focuses.
- **Keep `isTouched && !isValid` even though it is a no-op here.** TanStack's examples use `!isValid` alone, and under `onChange` the two are identical: `isTouched` flips true on the first change, so both render the error after one character (measured). The guard costs nothing and is the difference between correct and silent if the validator ever moves to `onBlur` or `onSubmit`.
- **Pass `field.state.meta.errors` straight through.** `FieldError` already dedupes by message and renders a list only for genuinely different ones. Do not slice, filter, or hand-pick an index; that hides real errors.
- **Empty and malformed are different failures.** Give the schema one `error` function that separates them rather than one message for both, or a required field reads as a malformed one.
- **Keep `z.string().trim()` in front of `z.email()`.** `z.email()` runs its format check before any trim, so a padded address is rejected outright. `z.email().trim()` does not fix it. No separate `.min(1)` is needed; the error function covers the empty case.
- **Normalization belongs to the API.** The form hands `onSubmit` the raw values, so a zod `.transform()` never reaches the payload. Check the router before adding client-side normalization; ours already trims and lowercases.
- **Focus the invalid field** from `onSubmitInvalid`, or a failed submit strands focus on the button while the message sits somewhere the visitor has to hunt for.
- **Wire `aria-describedby`** to the `FieldError`'s `id`, so returning to the field re-reads the message.
- **Declare the input's purpose:** `autoComplete` and `inputMode` on any field a browser can fill (WCAG 1.3.5). Without them a phone offers no saved value.
- **Keep the submit label.** Render the `Spinner` *beside* the label while pending, never instead of it, or the button's accessible name changes to "Loading" mid-flight.

## Success and error states

- A success state that replaces the form needs `role="status"`, `tabIndex={-1}` and focus moved to it: the form unmounted, so focus otherwise falls to `<body>` and a screen reader hears nothing.
- Echo what was submitted, offer a way back (the visitor may have typo'd), and offer one step forward so the flow does not dead-end.
- Never claim something the system did not do. "We sent a note to X" requires code that sends mail.
- A honeypot field stays unconstrained in the schema so it can never block a human, and is `aria-hidden` with `tabIndex={-1}` off-screen.

## Verify before shipping

Drive the real form in a browser; a type-check cannot see any of this. All four must hold:

1. **On load:** no error before the visitor has touched anything.
2. **Empty submit:** the required message, no network request, focus on the field.
3. **Malformed submit:** the malformed message, alone, not a list.
4. **Corrected value:** the message clears.

Then check `aria-describedby` points at the rendered error id, and that a success state takes focus and announces.
