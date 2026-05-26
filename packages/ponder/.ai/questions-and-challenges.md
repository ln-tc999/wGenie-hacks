---
description:
globs:
alwaysApply: false
---

This note outlined the development plan for DeFi Panda, a blockchain vault analytics application focused on the ERC4626 standard.

### Project Overview

- Building an application to analyze and display data from blockchain vaults
- Focus on creating an MVP with visualization of blockchain event data
- The application should work with any vault that follows the ERC4626 standard
- Project split between frontend visualization and backend data processing

### Technical Requirements

- Frontend will display data in elegant form on charts, tables and breakdowns
- Backend will collect events from the blockchain and save to database
- Data indexation will gather information for aggregation and evaluation
- Implementation of grids for data display (starting with simple linear grid)
- Focus on objective, straightforward data visualization

### Planned Features

- Total Value Locked (TVL) display and tracking
- Share price over time charts
- Number of depositors with current positions
- Sorted list of depositors (by TVL)
- Inflow/outflow chart with color-coded bars
- Links to external resources for supplementary data

### Development Considerations

- Need to research proper TVL calculation methodology
- Questions about event collection frequency (all events vs. optimization)
- Verification of vault compliance with ERC4626 standard
- Decision to exclude APR calculations due to complexity
- Potential bottlenecks in data aggregation and communication

### Action Items

- Create specific project version for the first month
- Research proper TVL calculation methodology
- Determine optimal approach for blockchain event collection with Ponder
- Develop data indexing and aggregation system
