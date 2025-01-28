'use client';

import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import toast from 'react-hot-toast';
import type { Gig, GigPriority } from '@/types';

// Available skills for the marketplace
const AVAILABLE_SKILLS = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Digital Marketing',
  'SEO',
  'Data Analysis',
  'Video Editing',
  'Social Media Management',
];

interface FormData {
  title: string;
  description: string;
  priority: GigPriority;
  deadline: string;
  budget: string;
  skills: string[];
}

const initialFormData: FormData = {
  title: '',
  description: '',
  priority: 'medium',
  deadline: '',
  budget: '',
  skills: [],
};

export default function CreateGigForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }
    if (!formData.budget || isNaN(Number(formData.budget)) || Number(formData.budget) <= 0) {
      newErrors.budget = 'Please enter a valid budget amount';
    }
    if (formData.skills.length === 0) {
      newErrors.skills = 'Please select at least one required skill';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const gigData: Omit<Gig, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: 'open',
        priority: formData.priority,
        posterId: user.id,
        budget: Number(formData.budget),
        deadline: formData.deadline,
        skills: formData.skills,
        createdAt: new Date().toISOString(),
        progress: 0,
      };

      await addDoc(collection(db, 'gigs'), gigData);
      toast.success('Gig posted successfully!');
      setFormData(initialFormData);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating gig:', error);
      toast.error('Failed to post gig. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          id="title"
          required
          className={`mt-1 block w-full rounded-md border ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm`}
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          required
          rows={4}
          className={`mt-1 block w-full rounded-md border ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm`}
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
            Budget ($)
          </label>
          <input
            type="number"
            id="budget"
            required
            min="1"
            step="1"
            className={`mt-1 block w-full rounded-md border ${
              errors.budget ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm`}
            value={formData.budget}
            onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
          />
          {errors.budget && (
            <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
          )}
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.priority}
            onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as GigPriority }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
            Deadline
          </label>
          <input
            type="date"
            id="deadline"
            required
            min={new Date().toISOString().split('T')[0]}
            className={`mt-1 block w-full rounded-md border ${
              errors.deadline ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm`}
            value={formData.deadline}
            onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
          />
          {errors.deadline && (
            <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Required Skills
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {AVAILABLE_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                formData.skills.includes(skill)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } transition-colors duration-200`}
            >
              {skill}
            </button>
          ))}
        </div>
        {errors.skills && (
          <p className="mt-1 text-sm text-red-600">{errors.skills}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : 'Post Gig'}
        </button>
      </div>
    </form>
  );
} 