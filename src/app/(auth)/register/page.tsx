"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2, Mail, User, Lock, Info, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import toast from "react-hot-toast"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ModeToggle } from "@/components/mode-toggle"

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[@$!%*?&#])/,
        "Password must include at least 1 special symbol"
      ),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  })

type RegisterValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterValues) => {
    setIsLoading(true)
    try {
      await api.post("/auth/register/", data)
      toast.success("Registration successful! Please login.")
      router.push("/login")
    } catch (error: any) {
      console.error(error)
      if (error.response?.data) {
        const serverErrors = error.response.data
        if (typeof serverErrors === "object") {
          Object.entries(serverErrors).forEach(([key, value]) => {
            const errorMessage = Array.isArray(value) ? value[0] : value
            toast.error(`${key}: ${errorMessage}`)
          })
        } else {
          toast.error("Registration failed. Please try again.")
        }
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-6 left-6 z-50">
        <Button variant="ghost" asChild>
          <Link href="/" className="flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <div className="absolute top-6 right-6 z-50">
        <ModeToggle />
      </div>
      
      <TooltipProvider>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground">Enter your details to get started</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <FieldSet>
                <Field>
                  <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
                  <InputGroup className={errors.full_name ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <User className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="full_name"
                      placeholder="John Doe"
                      {...register("full_name")}
                      aria-invalid={!!errors.full_name}
                      required
                    />
                  </InputGroup>
                  <FieldError errors={[errors.full_name]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <InputGroup className={errors.username ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <User className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="username"
                      placeholder="johndoe"
                      {...register("username")}
                      aria-invalid={!!errors.username}
                      required
                    />
                  </InputGroup>
                  <FieldError errors={[errors.username]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <InputGroup className={errors.email ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <Mail className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                      required
                    />
                  </InputGroup>
                  <FieldError errors={[errors.email]} />
                </Field>

                <Field>
                  <div className="flex items-center gap-2">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:outline-none">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Minimum 8 characters and must include at least 1 special symbol</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <InputGroup className={errors.password ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <Lock className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      {...register("password")}
                      aria-invalid={!!errors.password}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={[errors.password]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password_confirm">Confirm Password</FieldLabel>
                  <InputGroup className={errors.password_confirm ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <Lock className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="password_confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      {...register("password_confirm")}
                      aria-invalid={!!errors.password_confirm}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={[errors.password_confirm]} />
                </Field>
              </FieldSet>
            </FieldGroup>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
