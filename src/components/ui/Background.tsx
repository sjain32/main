'use client';

import DashboardPage from '@/app/dashboard/page';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from './button';
import Link from 'next/link';

export default function BackgroundWithContent() {
    const { data: session } = useSession();
    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* 🔹 Spline Background */}
            <div className="absolute inset-0 z-0">
                <iframe
                    src="https://my.spline.design/claritystream-5Kezu4e039QHVxHWmITmWKYi/"
                    frameBorder="0"
                    width="100%"
                    height="100%"
                    allowFullScreen
                ></iframe>
            </div >
            
            {/* 🔸 Foreground Content */}
            <div className="relative z-10 flex flex-col h-full  text-white text-center px-4">
                {/* Logo and Title Section */}
                 
                <div className='flex flex-col items-center justify-center mt-9 space-y-6'>
                    <h1 className="text-9xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text animate-pulse">
                        Scribble Scratch
                    </h1>
                    <h3 className='text-4xl font-poppins mt-25'>
                       A Collaborative Whiteboard
                    </h3>
                </div>

                {/* Tagline */}
                

                {/* Auth Section */}
                <div className="mt-20">
                    {!session ? (
                        <div className='flex mt-30 flex-col items-center space-y-6'>
                            <p className='text-2xl font-medium text-gray-300'>
                                Sign in to get started
                            </p>
                            <Button 
                                variant='outline' 
                                className='flex gap-4 items-center px-8 py-6 text-lg transition-all duration-300 hover:cursor-pointer hover:scale-105 hover:bg-purple-500/20'
                            >
                                <Link href='/signin'>Get Started</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className='flex flex-col items-center space-y-6'>
                            <p className="text-2xl font-medium text-gray-300">
                                Welcome back, {session.user?.name}
                            </p>
                            <div className="flex gap-4">
                                <Button 
                                    variant='outline' 
                                    className='flex gap-4 items-center px-8 py-6 text-lg transition-all duration-300 hover:scale-105 hover:bg-purple-500/20'
                                    onClick={() => signOut()}
                                >
                                    Sign Out
                                </Button>
                                <Button 
                                    variant='outline' 
                                    className='flex gap-4 items-center px-8 py-6 text-lg transition-all duration-300 hover:scale-105 hover:bg-purple-500/20'
                                >
                                    <Link href='/dashboard'>Go to Dashboard</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Gradient */}
            </div>
        </div>
    );
}
