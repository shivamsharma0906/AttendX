import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAppStore from '../store/useAppStore';

const DashboardCharts = () => {
  const { employees, records } = useAppStore();

  const data = employees.map(emp => {
    const empRecords = records.filter(r => r.empId === emp.id);
    let totalHrs = 0;
    empRecords.forEach(record => {
      if(record.inTime && record.outTime) {
        const [inH, inM] = record.inTime.split(':').map(Number);
        const [outH, outM] = record.outTime.split(':').map(Number);
        const diff = (outH + outM/60) - (inH + inM/60);
        totalHrs += diff > 0 ? diff : diff + 24;
      }
    });

    return {
      name: emp.name.split(' ')[0],
      hours: parseFloat(totalHrs.toFixed(1)),
      days: empRecords.length
    };
  }).sort((a,b) => b.hours - a.hours); // Sorted for Leaderboard

  return (
    <div className="w-full h-80">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              cursor={{ fill: '#ffffff0a' }}
              contentStyle={{ backgroundColor: '#12121a', border: '1px solid #ffffff1a', borderRadius: '8px', color: '#fff' }}
            />
            <Bar dataKey="hours" fill="url(#colorPurple)" radius={[4, 4, 0, 0]} />
            
            <defs>
              <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Analytics require employee data logic
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;
