import React from 'react'
import { NavLink } from 'react-router-dom'
import HomeIcon from '@mui/icons-material/Home';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import SettingsIcon from '@mui/icons-material/Settings';

export function NavigationBar() {
  return (
    <div className='navmenu-section'>
        <ul>
        <li title='Home'>
          <NavLink to="/" className={({isActive}) => isActive ? "active": ""}>
            <HomeIcon />
          </NavLink>
        </li>
        <li title='DynamicFormIcon'><NavLink to="/createplan" className={({isActive}) => isActive ? "active": ""}> <DynamicFormIcon /> </NavLink></li>
        <li title='Settings'><NavLink to="/settings" className={({isActive}) => isActive ? "active": ""}> <SettingsIcon /> </NavLink></li>
      </ul>
    </div>
  )
}