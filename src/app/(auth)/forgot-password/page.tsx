'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CheckCircle2, ChevronLeft, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { authService } from '@/services/auth.service'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
})

const otpSchema = z.object({
    otp: z.string().regex(/^\d{6,8}$/, 'Enter a valid 6-8 digit code'),
})

const passwordSchema = z
    .object({
        new_password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[@$!%*?&#])/, 'Password must include at least 1 special symbol'),
        password_confirm: z.string(),
    })
    .refine((data) => data.new_password === data.password_confirm, {
        message: 'Passwords do not match',
        path: ['password_confirm'],
    })

type EmailValues = z.infer<typeof emailSchema>
type OtpValues = z.infer<typeof otpSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'done'>('email')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [resetToken, setResetToken] = useState('')

    const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) })
    const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) })
    const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

    const stepTitle = useMemo(() => {
        if (step === 'email') return 'Recover your password'
        if (step === 'otp') return 'Verify the code'
        if (step === 'reset') return 'Set a new password'
        return 'Password updated'
    }, [step])

    const requestOtp = async (values: EmailValues) => {
        setIsLoading(true)
        try {
            const normalizedEmail = values.email.trim().toLowerCase()
            const response = await authService.requestPasswordReset(normalizedEmail)
            setEmail(normalizedEmail)
            setStep('otp')
            toast.success('OTP sent to your email')
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Could not start password recovery')
        } finally {
            setIsLoading(false)
        }
    }

    const verifyOtp = async (values: OtpValues) => {
        setIsLoading(true)
        try {
            const response = await authService.verifyPasswordResetOtp(email, values.otp)
            setResetToken(response.reset_token)
            setStep('reset')
            toast.success('Code verified')
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Invalid or expired code')
        } finally {
            setIsLoading(false)
        }
    }

    const resetPassword = async (values: PasswordValues) => {
        setIsLoading(true)
        try {
            await authService.resetPassword(resetToken, values.new_password, values.password_confirm)
            setStep('done')
            toast.success('Password updated')
            setTimeout(() => router.push('/login'), 1200)
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Could not reset password')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='relative flex min-h-screen items-center justify-center bg-background px-4 py-12'>
            <div className='absolute left-6 top-6 z-50'>
                <Button variant='ghost' asChild>
                    <Link href='/login' className='flex items-center'>
                        <ChevronLeft className='mr-2 h-4 w-4' />
                        Back to login
                    </Link>
                </Button>
            </div>
            <div className='absolute right-6 top-6 z-50'>
                <ModeToggle />
            </div>

            <TooltipProvider>
                <div className='w-full max-w-md space-y-8'>
                    <div className='text-center space-y-2'>
                        <h1 className='text-3xl font-bold tracking-tight'>{stepTitle}</h1>
                        <p className='text-muted-foreground'>Use the email on your account to receive a 2-minute OTP.</p>
                    </div>

                    {step === 'email' && (
                        <form onSubmit={emailForm.handleSubmit(requestOtp)} className='space-y-6'>
                            <FieldGroup>
                                <FieldSet>
                                    <Field>
                                        <FieldLabel htmlFor='email'>Email</FieldLabel>
                                        <InputGroup className={emailForm.formState.errors.email ? 'border-destructive ring-destructive/20' : ''}>
                                            <InputGroupAddon>
                                                <Mail className='h-4 w-4' />
                                            </InputGroupAddon>
                                            <InputGroupInput id='email' type='email' placeholder='Enter your email' {...emailForm.register('email')} />
                                        </InputGroup>
                                        <FieldError errors={[emailForm.formState.errors.email]} />
                                    </Field>
                                </FieldSet>
                            </FieldGroup>

                            <Button className='w-full' type='submit' disabled={isLoading}>
                                {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Sparkles className='mr-2 h-4 w-4' />}
                                Send OTP
                            </Button>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={otpForm.handleSubmit(verifyOtp)} className='space-y-6'>
                            <div className='rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground'>
                                We sent a code to <span className='font-medium text-foreground'>{email}</span>.
                            </div>
                            <FieldGroup>
                                <FieldSet>
                                    <Field>
                                        <FieldLabel htmlFor='otp'>OTP</FieldLabel>
                                        <InputGroup className={otpForm.formState.errors.otp ? 'border-destructive ring-destructive/20' : ''}>
                                            <InputGroupAddon>
                                                <ShieldCheck className='h-4 w-4' />
                                            </InputGroupAddon>
                                            <InputGroupInput id='otp' inputMode='numeric' maxLength={8} placeholder='00000000' {...otpForm.register('otp')} />
                                        </InputGroup>
                                        <FieldError errors={[otpForm.formState.errors.otp]} />
                                    </Field>
                                </FieldSet>
                            </FieldGroup>
                            <div className='flex gap-3'>
                                <Button type='button' variant='outline' className='flex-1' onClick={() => setStep('email')} disabled={isLoading}>
                                    Change email
                                </Button>
                                <Button className='flex-1' type='submit' disabled={isLoading}>
                                    {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <CheckCircle2 className='mr-2 h-4 w-4' />}
                                    Verify code
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 'reset' && (
                        <form onSubmit={passwordForm.handleSubmit(resetPassword)} className='space-y-6'>
                            <div className='rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground'>
                                Create a new password with at least 8 characters and 1 special symbol.
                            </div>
                            <FieldGroup>
                                <FieldSet>
                                    <Field>
                                        <FieldLabel htmlFor='new_password'>New password</FieldLabel>
                                        <InputGroup className={passwordForm.formState.errors.new_password ? 'border-destructive ring-destructive/20' : ''}>
                                            <InputGroupAddon>
                                                <KeyRound className='h-4 w-4' />
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                id='new_password'
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder='Create a new password'
                                                {...passwordForm.register('new_password')}
                                            />
                                            <InputGroupAddon align='inline-end'>
                                                <InputGroupButton variant='ghost' size='icon-xs' onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                                    {showPassword ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        <FieldError errors={[passwordForm.formState.errors.new_password]} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor='password_confirm'>Confirm password</FieldLabel>
                                        <InputGroup className={passwordForm.formState.errors.password_confirm ? 'border-destructive ring-destructive/20' : ''}>
                                            <InputGroupAddon>
                                                <KeyRound className='h-4 w-4' />
                                            </InputGroupAddon>
                                            <InputGroupInput id='password_confirm' type={showPassword ? 'text' : 'password'} placeholder='Confirm your password' {...passwordForm.register('password_confirm')} />
                                        </InputGroup>
                                        <FieldError errors={[passwordForm.formState.errors.password_confirm]} />
                                    </Field>
                                </FieldSet>
                            </FieldGroup>

                            <Button className='w-full' type='submit' disabled={isLoading}>
                                {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Sparkles className='mr-2 h-4 w-4' />}
                                Reset password
                            </Button>
                        </form>
                    )}

                    {step === 'done' && (
                        <div className='rounded-3xl border bg-card p-6 text-center space-y-4'>
                            <CheckCircle2 className='mx-auto h-10 w-10 text-green-500' />
                            <div>
                                <h2 className='text-xl font-semibold'>Password updated</h2>
                                <p className='text-sm text-muted-foreground'>Redirecting you back to login.</p>
                            </div>
                        </div>
                    )}
                </div>
            </TooltipProvider>
        </div>
    )
}