"use client"
import {
  FieldError,
  FieldValues,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form"
import { Button } from "@/components/atoms"
import { zodResolver } from "@hookform/resolvers/zod"
import { LabeledInput } from "@/components/cells"
import { registerFormSchema, RegisterFormData } from "./schema"
import { signup } from "@/lib/data/customer"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Container } from "@medusajs/ui"
import Link from "next/link"
import { PasswordValidator } from "@/components/cells/PasswordValidator/PasswordValidator"

export const RegisterForm = () => {
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
    },
  })

  return (
    <FormProvider {...methods}>
      <Form />
    </FormProvider>
  )
}

const Form = () => {
  const [passwordError, setPasswordError] = useState({
    isValid: false,
    lower: false,
    upper: false,
    "8chars": false,
    symbolOrDigit: false,
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string>("")
  const router = useRouter()
  const {
    handleSubmit,
    register,
    watch,
    formState: { errors, isSubmitting },
  } = useFormContext()

  const submit = async (data: FieldValues) => {
    setError("")

    if (!passwordError.isValid) {
      setError("Please fix the password errors before submitting.")
      return
    }

    const formData = new FormData()
    formData.append("email", data.email)
    formData.append("password", data.password)
    formData.append("first_name", data.firstName)
    formData.append("last_name", data.lastName)
    formData.append("phone", data.phone)

    const res = await signup(formData)

    if (!res || typeof res === "string") {
      setError(res || "Something went wrong. Please try again.")
      return
    }

    // Registration successful — redirect to account page
    router.push("/user")
  }

  return (
    <main className="container">
      <Container className="border max-w-xl mx-auto mt-8 p-4">
        <h1 className="heading-md text-primary uppercase mb-8">
          Create account
        </h1>
        <form onSubmit={handleSubmit(submit)}>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <LabeledInput
              className="md:w-1/2"
              label="First name"
              placeholder="Your first name"
              error={errors.firstName as FieldError}
              autoComplete="given-name"
              {...register("firstName")}
            />
            <LabeledInput
              className="md:w-1/2"
              label="Last name"
              placeholder="Your last name"
              error={errors.lastName as FieldError}
              autoComplete="family-name"
              {...register("lastName")}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <LabeledInput
              className="md:w-1/2"
              label="E-mail"
              placeholder="Your e-mail address"
              error={errors.email as FieldError}
              autoComplete="email"
              {...register("email")}
            />
            <LabeledInput
              className="md:w-1/2"
              label="Phone"
              placeholder="Your phone number"
              error={errors.phone as FieldError}
              autoComplete="tel"
              {...register("phone")}
            />
          </div>
          <div>
            <LabeledInput
              className="mb-4"
              label="Password"
              placeholder="Your password"
              type="password"
              error={errors.password as FieldError}
              autoComplete="new-password"
              {...register("password")}
            />
            <PasswordValidator
              password={watch("password")}
              setError={setPasswordError}
            />
          </div>

          {/* Terms & Conditions checkbox */}
          <label className="flex items-start gap-3 mt-6 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 shrink-0 accent-gray-900 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700 leading-relaxed">
              <Link
                href="/terms-and-conditions"
                className="transition-colors"
                style={{ color: "#30a17" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#000000")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#30a17")}
              >
                Şartlar ve Koşullar
              </Link>
              {" ve "}
              <Link
                href="/privacy-policy"
                className="transition-colors"
                style={{ color: "#30a17" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#000000")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#30a17")}
              >
                Gizlilik &amp; KVKK Politikası
              </Link>
              {" metnini okudum, onaylıyorum."}
            </span>
          </label>

          {error && <p className="label-md text-negative">{error}</p>}
          <Button
            className="w-full flex justify-center mt-8 uppercase"
            disabled={isSubmitting || !termsAccepted}
            loading={isSubmitting}
          >
            Create account
          </Button>
        </form>
      </Container>
      <Container className="border max-w-xl mx-auto p-4">
        <h1 className="heading-md text-primary uppercase mb-8">
          Already have an account?
        </h1>
        <p className="text-center label-md">
          <Link href="/user">
            <Button
              variant="tonal"
              className="w-full flex justify-center mt-8 uppercase"
            >
              Log in
            </Button>
          </Link>
        </p>
      </Container>
    </main>
  )
}
