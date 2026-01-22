import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            onboardingType,
            companyName,
            registrationNumber,
            fullName,
            fullNamePassport,
            email,
            photoId,
            proofOfAddress
        } = body;

        // Basic Validation
        if (!onboardingType) {
            return NextResponse.json(
                { message: 'Missing onboarding type' },
                { status: 400 }
            );
        }

        if ((onboardingType === 'business' || onboardingType === 'both') && (!companyName || !registrationNumber)) {
            // Only strictly required for business/both types in this mock
            if (onboardingType === 'business') {
                return NextResponse.json(
                    { message: 'Missing Company Details' },
                    { status: 400 }
                );
            }
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simulate AML Check Logic (Mock)
        if (companyName && companyName.toLowerCase().includes("risky")) {
            return NextResponse.json(
                { message: 'AML Check Failed: Company flagged.' },
                { status: 403 }
            );
        }

        // Send Email via Resend if instance is available
        if (resend) {
            try {
                await resend.emails.send({
                    from: 'Figures Onboarding <onboarding@resend.dev>',
                    to: ['admin@figures.com'], // In a real app, this would be the business notification email
                    subject: `New Onboarding: ${companyName || fullName || fullNamePassport}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #111;">New Onboarding Submission</h2>
                            <p>A new ${onboardingType} onboarding request has been submitted.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${fullName || fullNamePassport || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${email || 'N/A'}</td>
                                </tr>
                                ${companyName ? `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Company</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${companyName} (${registrationNumber})</td>
                                </tr>
                                ` : ''}
                            </table>

                            <h3 style="color: #111; margin-top: 30px;">Verification Documents</h3>
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                ${photoId ? `<a href="${photoId}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Photo ID</a>` : ''}
                                ${proofOfAddress ? `<a href="${proofOfAddress}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Proof of Address</a>` : ''}
                            </div>

                            <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                                This is an automated notification from the Figures Onboarding System.
                            </p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error("Resend Error:", emailError);
            }
        }

        return NextResponse.json(
            { message: 'Verification successful', status: 'cleared' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
