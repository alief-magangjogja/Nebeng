import React from "react";

function SelectField({ label, name, value, onChange, options = [], placeholder = "", className = "", id, required, ...rest }) {
	return (
		<div className="space-y-1">
			{label && (
				<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor={id || name}>
					{label}
				</label>
			)}

			<select
				id={id || name}
				name={name}
				value={value}
				onChange={onChange}
				required={required}
				className={`w-full pl-4 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${className}`}
				{...rest}
			>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map((opt, idx) => (
					<option key={idx} value={typeof opt === "string" ? opt : opt.value}>
						{typeof opt === "string" ? opt : opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

export default SelectField;
