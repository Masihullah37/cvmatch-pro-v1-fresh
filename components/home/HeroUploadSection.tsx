'use client';

import { useState, useEffect } from 'react';
import CVUploadPanel from './CVUploadPanel';
import JobInputPanel from './JobInputPanel';
import AnalyzeButton from './AnalyzeButton';
import { useAuth } from '@clerk/nextjs';

export default function HeroUploadSection() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [profileDescription, setProfileDescription] = useState('');

  const { userId } = useAuth();
  const [prevUserId, setPrevUserId] = useState<string | null | undefined>(userId);

  useEffect(() => {
    // Reset form states if user logs out
    if (prevUserId && !userId) {
      setCvFile(null);
      setCvUrl('');
      setJobTitle('');
      setJobDescription('');
      setProfileDescription('');
    }
    setPrevUserId(userId);
  }, [userId, prevUserId]);

  return (
    <div className="w-full mt-4 relative">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <JobInputPanel
          jobTitle={jobTitle}
          setJobTitle={setJobTitle}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
        />
        <CVUploadPanel
          cvFile={cvFile}
          setCvFile={setCvFile}
          cvUrl={cvUrl}
          setCvUrl={setCvUrl}
          profileDescription={profileDescription}
          setProfileDescription={setProfileDescription}
        />
      </div>

      <div className="mt-12 flex justify-center pb-10">
        <AnalyzeButton
          cvFile={cvFile}
          cvUrl={cvUrl}
          jobTitle={jobTitle}
          jobDescription={jobDescription}
          profileDescription={profileDescription}
        />
      </div>
    </div>
  );
}



