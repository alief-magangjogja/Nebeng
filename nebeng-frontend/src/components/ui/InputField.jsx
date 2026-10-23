import React from "react";

function InputField({ label, type = "text", placeholder = "", value, onChange, icon, rightIcon, className = "", name, id, required, ...rest }) {
	return (
		<div className="space-y-1">
			{label && (
				<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor={id || name}>
					{label}
				</label>
			)}

			<div className="relative group">
				{icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors">{icon}</div>}

				<input
					id={id || name}
					name={name}
					type={type}
					required={required}
					placeholder={placeholder}
					value={value}
					onChange={onChange}
					className={`w-full ${icon ? "pl-12" : "pl-4"} pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${className}`}
					{...rest}
				/>

				{rightIcon && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightIcon}</div>}
			</div>
		</div>
	);
}

export default InputField;
