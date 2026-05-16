"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock, Info, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { setAuthTokens, clearAuthCookies } from "@/lib/cookies"
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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginValues) => {
    setIsLoading(true)
    try {
      // Clear any stale tokens before attempting login
      clearAuthCookies()
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      
      const response = await api.post("/auth/login/", data)
      // console.log("Login response:", response.data) // Removed to prevent leaking tokens in console
      
      // Backend returns access_token and refresh_token
      const authToken = response.data.access_token || response.data.access || response.data.token
      const refreshToken = response.data.refresh_token || response.data.refresh
      
      if (authToken) {
        // Set secure cookies using utility function
        setAuthTokens(authToken, refreshToken)
        
        // Keep in localStorage as fallback during migration
        // TODO: Remove this once backend sets httpOnly cookies
        localStorage.setItem("token", authToken)
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken)
        }
        
        toast.success("Welcome back!")
        router.push("/dashboard")
      } else {
        console.error("No token found in response. Full response:", response.data)
        toast.error("Login succeeded but no token received")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      console.error("Response data:", error.response?.data)  // See exact backend error
      if (error.response?.status === 401) {
        toast.error("Invalid credentials")
      } else if (error.response?.data) {
        // Show backend error message if available
        const errorMessage = error.response.data.detail || 
                           error.response.data.error || 
                           error.response.data.message ||
                           "Something went wrong. Please try again."
        toast.error(errorMessage)
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
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
        <div className="w-64 rounded-md border border-border/60 bg-background/90 p-3 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <p>Loading may take some time due to free tier hosting.</p>
          <p className="mt-2">
            <span className="font-medium text-foreground">Email:</span> sadikmahmud01@gmail.com
          </p>
          <p>
            <span className="font-medium text-foreground">Password:</span> test@123
          </p>
        </div>
        <ModeToggle />
      </div>
      
      <TooltipProvider>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <FieldSet>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <InputGroup className={errors.email ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <Mail className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                      required
                    />
                  </InputGroup>
                  <FieldError errors={[errors.email]} />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
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
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <InputGroup className={errors.password ? "border-destructive ring-destructive/20" : ""}>
                    <InputGroupAddon>
                      <Lock className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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
              </FieldSet>
            </FieldGroup>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign in
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
