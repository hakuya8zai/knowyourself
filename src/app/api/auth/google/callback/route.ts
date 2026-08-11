/**
 * Google Sign-In Redirect Callback
 * Handles the redirect from Google OAuth and sets httpOnly cookies
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.selfkit.art/api/v1';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://knowyourself.selfkit.art';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const credential = formData.get('credential') as string;
    
    if (!credential) {
      console.error('No credential in form data');
      return NextResponse.redirect(`${BASE_URL}/?error=no_credential`);
    }
    
    // Verify token with backend
    const backendResponse = await fetch(`${API_URL}/auth/google/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: credential }),
    });
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend auth failed:', errorText);
      return NextResponse.redirect(`${BASE_URL}/?error=auth_failed`);
    }
    
    const data = await backendResponse.json();
    
    // Get return URL from cookie (set before OAuth redirect)
    const returnUrlCookie = request.cookies.get('kys_return_url')?.value;
    let redirectUrl = `${BASE_URL}/dashboard`;  // Default to dashboard after login
    
    if (returnUrlCookie) {
      try {
        const decodedUrl = decodeURIComponent(returnUrlCookie);
        // Validate it's from our domain
        const url = new URL(decodedUrl);
        if (url.origin === new URL(BASE_URL).origin) {
          redirectUrl = decodedUrl;
        }
      } catch {
        // Invalid URL, use default
      }
    }
    
    // Create redirect response
    const response = NextResponse.redirect(redirectUrl);
    
    // Clear the return_url cookie
    response.cookies.set('kys_return_url', '', { path: '/', maxAge: 0 });
    
    // Set auth cookies from backend response tokens
    // Backend returns: { user: {...}, tokens: { access_token, refresh_token, expires_in } }
    if (data.tokens) {
      // Access token - httpOnly, cross-subdomain
      response.cookies.set('kys_access_token', data.tokens.access_token, {
        path: '/',
        // The JWT expires before this cookie; keeping the cookie allows the
        // client to reach /auth/refresh without a false login redirect.
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: true,
        sameSite: 'lax', // selfkit.art subdomains are same-site
        domain: '.selfkit.art',
      });
      
      // Refresh token - httpOnly, only for auth endpoints
      response.cookies.set('kys_refresh_token', data.tokens.refresh_token, {
        path: '/api/v1/auth',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        domain: '.selfkit.art',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(`${BASE_URL}/?error=server_error`);
  }
}

// Handle GET for debugging
export async function GET() {
  return NextResponse.redirect(`${BASE_URL}/?error=invalid_method`);
}
