import React, { useState, useEffect } from 'react';
import {
  createLeaveRequest,
  getLeaveRequestsByEmployee,
  getAllLeaveRequests,
  updateLeaveRequestStatus,
} from '../services/firestoreService';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Send, User, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveManagementModal({ isOpen, onClose, user, isAdmin = false }) {
  const [activeTab, setActiveTab] = useState(isAdmin ? 'requests' : 'apply');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('casual');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review comment state
  const [reviewComments, setReviewComments] = useState({});

  const loadRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const data = await getAllLeaveRequests();
        setRequests(data.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0)));
      } else if (user?.uid || user?.id) {
        const empId = user.employeeId || user.id || user.uid;
        const data = await getLeaveRequestsByEmployee(empId);
        setRequests(data.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0)));
      }
    } catch (err) {
      console.error('Error loading leave requests:', err);
      toast.error('Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen, loadRequests]);


  const handleApply = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      const empId = user.employeeId || user.id || user.uid;
      const empName = user.name || user.displayName || user.email || 'Employee';

      await createLeaveRequest({
        employeeId: empId,
        employeeName: empName,
        startDate,
        endDate,
        reason,
        type,
      });

      toast.success('Leave request submitted successfully!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setType('casual');
      loadRequests();
      setActiveTab('history');
    } catch (err) {
      console.error('Error submitting leave:', err);
      toast.error('Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (requestId, status) => {
    const comment = reviewComments[requestId] || '';
    try {
      await updateLeaveRequestStatus(requestId, status, comment, user?.uid || 'admin');
      toast.success(`Leave request ${status}!`);
      loadRequests();
    } catch (err) {
      console.error('Error updating leave status:', err);
      toast.error('Action failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Leave & Time-Off Management</h2>
              <p className="text-xs text-slate-400">Request leave or review team requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          {!isAdmin && (
            <button
              onClick={() => setActiveTab('apply')}
              className={`py-3.5 px-4 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
                activeTab === 'apply'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" /> Request Leave
            </button>
          )}
          <button
            onClick={() => setActiveTab(isAdmin ? 'requests' : 'history')}
            className={`py-3.5 px-4 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === (isAdmin ? 'requests' : 'history')
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" /> {isAdmin ? 'Pending & All Requests' : 'My Leave History'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'apply' && !isAdmin && (
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Leave Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="paid">Paid Time Off (PTO)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Reason for Request *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain brief reason for time-off..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          )}

          {(activeTab === 'history' || activeTab === 'requests') && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-400">Loading leave requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No leave requests found.</div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{req.employeeName || req.employeeId}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase tracking-wide">
                          {req.type}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {req.startDate} to {req.endDate}
                      </p>
                      <p className="text-sm text-slate-300 italic">"{req.reason}"</p>
                      {req.comment && (
                        <p className="text-xs text-indigo-300">
                          <strong>Admin Note:</strong> {req.comment}
                        </p>
                      )}
                    </div>

                    {isAdmin && req.status === 'pending' && (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Optional comment..."
                          value={reviewComments[req.id] || ''}
                          onChange={(e) => setReviewComments({ ...reviewComments, [req.id]: e.target.value })}
                          className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(req.id, 'approved')}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'rejected')}
                            className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
