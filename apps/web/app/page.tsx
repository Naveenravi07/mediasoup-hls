'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import landingImg from "../public/landing.png"
import Image from "next/image"
import useAuth from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

export default function LandingPage() {

    const [currentSlide, setCurrentSlide] = useState(0)
    const { user } = useAuth()
    const router = useRouter()

    const handleStreamJoin = async () => {
        if (user == undefined || user == null) {
            return router.push("/auth/login")
        } else {
            router.push("/stream")
        }
    }

    const handleWatchJoin = async () => {
        router.push("/watch")
    }


    const slides = [
        {
            title: "Get a link that you can share",
            description: "Click New meeting to get a link that you can send to people that you want to meet with"
        },
        {
            title: "Plan ahead",
            description: "Schedule meetings in your calendar and get reminders before they start"
        },
        {
            title: "Your meetings are secure",
            description: "All meetings are encrypted in transit and our safety measures are continuously updated"
        }
    ]

    return (
        <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 items-center w-full max-w-6xl mx-auto">
                {/* Left Column */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Video calls and meetings for everyone
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Connect, collaborate and celebrate from anywhere with our secure video chat platform
                        </p>
                    </div>

                    <div className="space-y-4 space-x-4 max-w-md ">
                        <Button onClick={handleStreamJoin}> Join Meeting</Button>
                        <Button onClick={handleWatchJoin}> Watch Meeting</Button>

                    </div>

                </div>

                {/* Right Column */}
                <div className="relative">
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-full aspect-square p-8 relative">
                        <Image
                            height={400}
                            width={400}
                            src={landingImg}
                            alt="Video chat illustration"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Carousel */}
                    <div className="mt-8 relative">
                        <div className="text-center max-w-md mx-auto">
                            <h2 className="text-xl font-semibold mb-2">{slides[currentSlide]?.title}</h2>
                            <p className="text-muted-foreground">{slides[currentSlide]?.description}</p>
                        </div>

                        <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                                className="absolute left-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex gap-2 justify-center">
                                {slides.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`h-2 w-2 rounded-full ${currentSlide === index ? 'bg-primary' : 'bg-muted'
                                            }`}
                                    />
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                                className="absolute right-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

