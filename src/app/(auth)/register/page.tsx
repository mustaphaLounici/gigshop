'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { UserRole } from '@/types';
import { getRoleBasedRedirect } from '@/utils/navigation';

const AVAILABLE_SKILLS = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Digital Marketing',
  'SEO',
  'Video Editing',
  'Data Entry',
  'Virtual Assistant',
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('freelancer');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
        rating: 0,
        completedGigs: 0,
        skills: role === 'freelancer' ? skills : [],
      });

      toast.success('Account created successfully!');
      const redirectPath = getRoleBasedRedirect(role);
      router.push(redirectPath);
    } catch (error) {
      toast.error('Failed to create account. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                I want to
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="freelancer">Work as a freelancer</option>
                <option value="client">Hire freelancers</option>
              </select>
            </div>

            {role === 'freelancer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={skills.includes(skill)}
                        onChange={() => handleSkillToggle(skill)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || (role === 'freelancer' && skills.length === 0)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 