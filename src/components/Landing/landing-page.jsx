import React, { useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ArrowRight, CheckCircle, DollarSign, Lock, Users, Star, ArrowDown } from 'lucide-react';
import ThreeScene from "./ThreeScene";
import CountUp from "react-countup";
import { TypeAnimation } from "react-type-animation";
import { Link } from "react-router-dom";
import { GridBackgroundDemo } from "../ui/background";

const AnimatedCard = motion(Card);

const FeatureCard = ({ feature, index }) => {
  return (
    <AnimatedCard
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-zinc-800 border border-zinc-700 hover:border-emerald-400 transition-colors"
    >
      <CardHeader>
        <CardTitle className="flex items-center text-emerald-400">
          {feature.icon}
          <span className="ml-2 text-zinc-50">{feature.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-zinc-300">{feature.description}</CardDescription>
      </CardContent>
    </AnimatedCard>
  );
};

const TestimonialCard = ({ testimonial }) => (
  <AnimatedCard className="bg-zinc-800 border border-zinc-700 hover:border-emerald-400 transition-colors">
    <CardHeader>
      <div className="flex items-center gap-4">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
        />
        <div>
          <CardTitle className="text-lg text-zinc-50">{testimonial.name}</CardTitle>
          <CardDescription className="text-zinc-400">{testimonial.role}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
        ))}
      </div>
      <p className="text-zinc-300">{testimonial.content}</p>
    </CardContent>
  </AnimatedCard>
);

const StatCard = ({ value, label, prefix = "" }) => (
  <Card className="bg-zinc-800 border border-zinc-700 hover:border-emerald-400 transition-colors">
    <CardContent className="pt-6">
      <div className="text-3xl font-bold text-emerald-400 mb-2">
        <CountUp end={value} prefix={prefix} duration={2.5} />
      </div>
      <CardDescription className="text-zinc-300">{label}</CardDescription>
    </CardContent>
  </Card>
);

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-zinc-50">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-md">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
          >
            Flowease
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-x-4"
          >
            <Button
              variant="ghost"
              className="text-zinc-200 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
            >
              Features
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-200 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
            >
              How It Works
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-200 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
            >
              About
            </Button>
            <Link to="/dashboard">
              <Button
                variant="outline"
                className="border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-600 hover:text-white"
              >
                Get Started
              </Button>
            </Link>
          </motion.div>
        </nav>
      </header>
      <div className="relative">
        <div className="absolute inset-0 z-0">
          <GridBackgroundDemo />
        </div>

        <div className="relative z-10">


          <main className="container mx-auto px-4 py-32 pt-52">
            <motion.section
              className="mb-20 text-center relative"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* <div className="absolute inset-0 -z-10 h-96 mb-20 ">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 animate-pulse" />
              </div> */}

              <h2 className="mb-6 text-5xl font-bold leading-tight lg:text-6xl mt-48">
                <TypeAnimation
                  sequence={[
                    "Secure Payments",
                    1000,
                    "Smart Contracts",
                    1000,
                    "Decentralized Future",
                    1000,
                  ]}
                  wrapper="span"
                  repeat={Infinity}
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
                />
              </h2>
              <p className="mb-8 text-xl text-zinc-300 max-w-3xl mx-auto">
                Eliminating middlemen by enabling direct, milestone-based, and
                escrow-secured payment requests between freelancers and clients
                using Request Network.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/dashboard">
                  <Button className="bg-emerald-500 text-zinc-900 hover:bg-emerald-600 hover:text-zinc-50">
                    Start Your Project <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-zinc-700 bg-transparent hover:bg-zinc-800 hover:text-white"
                >
                  Watch Demo
                </Button>
              </div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-16"
              >
                <ArrowDown className="mx-auto w-6 h-6 text-emerald-400" />
              </motion.div>
            </motion.section>

            <section className="mb-24 grid grid-cols-4 gap-8">
              <StatCard value={10000} prefix="$" label="Total Volume Processed" />
              <StatCard value={500} label="Active Users" />
              <StatCard value={1000} label="Projects Completed" />
              <StatCard value={99.9} prefix="%" label="Success Rate" />
            </section>

            <section className="mb-16 relative overflow-hidden">
              <motion.div style={{ y }} className="absolute inset-0 z-0">
                <div className="w-full h-full bg-gradient-to-b from-emerald-900/20 to-zinc-900/20" />
              </motion.div>
              <div className="relative z-10 bg-zinc-900/80 backdrop-blur-sm p-8 rounded-lg">
                <h3 className="mb-8 text-2xl font-semibold">Core Features</h3>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      title: "Payment Requests",
                      icon: <DollarSign className="h-6 w-6 text-emerald-400" />,
                      description:
                        "Create customized payment requests with service details and preferred cryptocurrency.",
                    },
                    {
                      title: "Milestone-Based Payments",
                      icon: <CheckCircle className="h-6 w-6 text-emerald-400" />,
                      description:
                        "Break large projects into milestones for phased payments and accountability.",
                    },
                    {
                      title: "Escrow Integration",
                      icon: <Lock className="h-6 w-6 text-emerald-400" />,
                      description:
                        "Funds are held in a smart contract until the client approves the milestone.",
                    },
                    {
                      title: "Multi-Currency Support",
                      icon: <Users className="h-6 w-6 text-emerald-400" />,
                      description:
                        "Support for multiple cryptocurrencies with real-time conversion.",
                    },
                  ].map((feature, index) => (
                    <FeatureCard key={index} feature={feature} index={index} />
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-16">
              <h3 className="mb-8 text-2xl font-semibold">How It Works</h3>
              <Tabs defaultValue="freelancer" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
                  <TabsTrigger
                    value="freelancer"
                    className="text-zinc-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                  >
                    For Freelancers
                  </TabsTrigger>
                  <TabsTrigger
                    value="client"
                    className="text-zinc-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                  >
                    For Clients
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="freelancer">
                  <Card className="bg-zinc-800/90 border border-zinc-700">
                    <CardHeader>
                      <CardTitle className="text-zinc-50">Freelancer Workflow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal pl-5 space-y-2 text-zinc-50">
                        <li className="text-zinc-50">Create project and define milestones</li>
                        <li className="text-zinc-50">Send payment requests for each milestone</li>
                        <li className="text-zinc-50">Complete work and submit for approval</li>
                        <li className="text-zinc-50">Receive payment upon client approval</li>
                      </ol>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="client">
                  <Card className="bg-zinc-800/90 border border-zinc-700">
                    <CardHeader>
                      <CardTitle className="text-zinc-50">Client Workflow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal pl-5 space-y-2 text-zinc-50">
                        <li className="text-zinc-50">Review payment request and project details</li>
                        <li className="text-zinc-50">Approve and fund escrow for milestones</li>
                        <li className="text-zinc-50">Review completed work for each milestone</li>
                        <li className="text-zinc-50">Approve or request revisions</li>
                        <li className="text-zinc-50">Release payment upon satisfaction</li>
                      </ol>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            <section className="mb-16">
              <h3 className="mb-8 text-2xl font-semibold">Flowease in Action</h3>
              <div className="w-full h-[400px]">
                <ThreeScene />
              </div>
            </section>

            <section className="mb-24">
              <h3 className="mb-12 text-3xl font-semibold text-center">
                What Our Users Say
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <TestimonialCard key={index} testimonial={testimonial} />
                ))}
              </div>
            </section>

            <motion.section
              className="text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="mb-4 text-2xl font-semibold">Ready to Get Started?</h3>
              <p className="mb-8 text-zinc-300">
                Join the future of decentralized freelancing and secure payments
                with Flowease.
              </p>
              <Link to="/dashboard">
                <Button className="bg-emerald-500 text-zinc-900 hover:bg-emerald-600">
                  Sign Up Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.section>
          </main>

          <footer className="border-t border-zinc-800 bg-zinc-900 p-12">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4 text-emerald-400">Flowease</h4>
                <p className="text-zinc-300">
                  Building the future of decentralized payments.
                </p>
              </div>
              {/* Add more footer content here */}
            </div>
            <div className="text-center mt-12 text-zinc-400">
              <p>&copy; 2024 Flowease. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Freelance Developer",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    content:
      "Flowease has transformed how I handle client payments. The escrow system gives both parties peace of mind.",
  },
  {
    name: "Michael Chen",
    role: "Project Manager",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    content:
      "The milestone-based payment system has made it easy to track project progress and manage payments efficiently.",
  },
  {
    name: "Emma Wilson",
    role: "UI/UX Designer",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    content:
      "As a freelancer, getting paid has never been easier. The platform is intuitive and secure.",
  },
];

