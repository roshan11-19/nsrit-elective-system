import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  ShieldCheck, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export default function HelpContactPage() {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'What is the FIFO (First-In, First-Out) Allotment Rule?',
      a: 'Elective seat allocation is processed in strict chronological order based on the exact millisecond timestamp your priority selections are submitted to the college database. The earliest submitters receive their top priorities first until the subject seat quota is filled.'
    },
    {
      q: 'What happens if all my selected elective priorities are full?',
      a: 'If every subject in your submitted priority list reaches its maximum seat limit before your turn is reached in the FIFO queue, your status will be recorded as "WAITLISTED". You can consult the Academic Coordinator office for manual allotment or reallocation into remaining vacancies.'
    },
    {
      q: 'Can I change my elective subject preferences after submitting?',
      a: 'Yes, as long as the selection window remains "Active" and has not reached its closing deadline. Updating your preferences will refresh your submission timestamp to the current time for the FIFO queue.'
    },
    {
      q: 'How do I log in for the first time as a student?',
      a: 'Your username is your college Roll Number (e.g. 24NU1A05J9) and your default temporary password is also your Roll Number. Upon your first login, the system will prompt you to set a new password before accessing your elective selection.'
    },
    {
      q: 'What is the difference between Professional Elective (PE) and Open Elective (OE)?',
      a: 'Professional Electives are specialized departmental courses offered strictly to students of your branch (e.g. CSE). Open Electives are interdisciplinary courses open across multiple departments and disciplines.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-crimson-50 border border-crimson-200 text-xs font-bold text-crimson-700 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          <span>Support & Academic Guidelines</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 font-display">
          Help, Rules & Contact Desk
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Everything you need to know about the Autonomous Elective Selection and FIFO Allotment procedure.
        </p>
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 font-display mb-2">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-crimson-700 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white text-xs text-gray-600 leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Office & Coordinator Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Academic Office Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-display">
            Dean of Academics Office
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            For regulation policy inquiries, curriculum queries, and seat capacity escalations.
          </p>
          <div className="space-y-2 pt-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-crimson-600" />
              <span>dean.academics@college.edu</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-crimson-600" />
              <span>+91 866-2468001 / Ext 105</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-crimson-600" />
              <span>Administrative Block, Floor 2</span>
            </div>
          </div>
        </div>

        {/* Technical Support Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-display">
            IT & Portal Technical Helpdesk
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            For login issues, roll number credential resets, and server submission assistance.
          </p>
          <div className="space-y-2 pt-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>portal.support@college.edu</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-600" />
              <span>+91 866-2468002 / Ext 402</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Mon – Sat: 9:00 AM – 5:00 PM</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
