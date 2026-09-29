import { useState } from 'react'
import { Building, MapPin, CheckCircle, Star, Users } from '@phosphor-icons/react'

// Mock vendor data - replace with API call to Airtable
const initialVendors = [
  {
    id: 1,
    name: 'FreshMart Organic',
    category: 'Groceries',
    location: 'Lagos Mainland',
    rating: 4.8,
    reviews: 142,
    products: ['Fresh Vegetables', 'Fruits', 'Organic Eggs'],
    status: 'Active',
    joinedDate: '2024-01-15',
    ordersCompleted: 256,
  },
  {
    id: 2,
    name: 'Lagos Fish Market',
    category: 'Seafood',
    location: 'Victoria Island',
    rating: 4.6,
    reviews: 89,
    products: ['Fresh Fish', 'Shrimp', 'Crab'],
    status: 'Active',
    joinedDate: '2024-02-10',
    ordersCompleted: 178,
  },
  {
    id: 3,
    name: 'Bakery Delight',
    category: 'Bakery',
    location: 'Ikeja',
    rating: 4.9,
    reviews: 203,
    products: ['Bread', 'Cakes', 'Pastries'],
    status: 'Active',
    joinedDate: '2024-01-05',
    ordersCompleted: 312,
  },
  {
    id: 4,
    name: 'Tech Gadgets NG',
    category: 'Electronics',
    location: 'Yaba',
    rating: 4.7,
    reviews: 67,
    products: ['Phones', 'Laptops', 'Accessories'],
    status: 'Active',
    joinedDate: '2024-03-20',
    ordersCompleted: 94,
  },
  {
    id: 5,
    name: 'Fashion Hub',
    category: 'Clothing',
    location: 'Lekki',
    rating: 4.5,
    reviews: 124,
    products: ['Traditional Wear', 'Casual Wear', 'Accessories'],
    status: 'Onboarding',
    joinedDate: '2024-04-01',
    ordersCompleted: 45,
  },
  {
    id: 6,
    name: 'Home Essentials',
    category: 'Home & Kitchen',
    location: 'Surulere',
    rating: 4.4,
    reviews: 56,
    products: ['Cookware', 'Utensils', 'Home Decor'],
    status: 'Active',
    joinedDate: '2024-02-28',
    ordersCompleted: 123,
  },
  {
    id: 7,
    name: 'Health Pharmacy',
    category: 'Health',
    location: 'Gbagada',
    rating: 4.8,
    reviews: 187,
    products: ['Medicines', 'Supplements', 'Personal Care'],
    status: 'Active',
    joinedDate: '2024-01-20',
    ordersCompleted: 289,
  },
  {
    id: 8,
    name: 'Book Nook',
    category: 'Books',
    location: 'Abuja',
    rating: 4.3,
    reviews: 42,
    products: ['Fiction', 'Non-Fiction', 'Educational'],
    status: 'Active',
    joinedDate: '2024-03-15',
    ordersCompleted: 78,
  },
]

function VendorsTable() {
  const [vendors] = useState(initialVendors)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Extract unique categories and statuses
  const categories = ['All', ...new Set(vendors.map(v => v.category))]
  const statuses = ['All', ...new Set(vendors.map(v => v.status))]

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase()) ||
                         vendor.location.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || vendor.category === categoryFilter
    const matchesStatus = statusFilter === 'All' || vendor.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <div className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-4">
                GotoMart Vendors Directory
              </h1>
              <p className="text-lg text-blue-100 max-w-3xl">
                Meet the trusted vendors powering Nigeria's WhatsApp marketplace. 
                Browse through our network of local businesses serving communities across the country.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-6 w-full lg:w-auto">
              <Building className="w-12 h-12 text-blue-200" weight="duotone" />
              <div>
                <div className="text-2xl font-bold">{vendors.length}</div>
                <div className="text-blue-100">Active Vendors</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vendors by name or location..."
                  className="w-full px-4 py-3 pl-12 rounded-lg border border-light-gray focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <select
                className="px-4 py-3 rounded-lg border border-light-gray bg-white focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-colors"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              
              <select
                className="px-4 py-3 rounded-lg border border-light-gray bg-white focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-text">
            Showing {filteredVendors.length} of {vendors.length} vendors
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-gray">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-text uppercase tracking-wider">
                    Vendor Details
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-text uppercase tracking-wider">
                    Category & Location
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-text uppercase tracking-wider">
                    Rating & Reviews
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-text uppercase tracking-wider">
                    Performance
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-text uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-cream transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center shrink-0 mr-4">
                          <Building className="w-6 h-6 text-navy" weight="duotone" />
                        </div>
                        <div>
                          <div className="text-base font-medium text-gray-900">{vendor.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-sm text-gray-text">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Joined {vendor.joinedDate}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {vendor.products.slice(0, 3).map((product, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs bg-blue-50 text-navy rounded">
                                {product}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="px-3 py-1 bg-blue-50 text-navy text-sm font-medium rounded-full inline-block">
                          {vendor.category}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-text">
                          <MapPin className="w-4 h-4" />
                          {vendor.location}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-500" weight="fill" />
                          <span className="text-lg font-semibold text-gray-900">{vendor.rating}</span>
                          <span className="text-sm text-gray-text">/5.0</span>
                        </div>
                        <div className="text-sm text-gray-text">
                          {vendor.reviews.toLocaleString()} reviews
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-text" />
                          <span className="text-sm font-medium text-gray-900">
                            {vendor.ordersCompleted.toLocaleString()} orders
                          </span>
                        </div>
                        <div className="text-xs text-gray-text">
                          {Math.round(vendor.ordersCompleted / vendor.reviews * 100)} orders per review
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                        ${vendor.status === 'Active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-yellow-50 text-yellow-700'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${vendor.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        {vendor.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredVendors.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-text">No vendors found matching your criteria</p>
                <button 
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('All')
                    setStatusFilter('All')
                  }}
                  className="mt-4 text-navy hover:text-navy-dark underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {filteredVendors.length > 0 && (
            <div className="px-6 py-4 border-t border-light-gray flex items-center justify-between">
              <div className="text-sm text-gray-text">
                Page 1 of 1
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm border border-light-gray rounded-lg hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                <button className="px-4 py-2 text-sm border border-light-gray rounded-lg hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {vendors.filter(v => v.status === 'Active').length}
                </div>
                <div className="text-sm text-gray-text">Active Vendors</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" weight="duotone" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {vendors.reduce((sum, v) => sum + v.reviews, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-text">Total Reviews</div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" weight="duotone" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {vendors.reduce((sum, v) => sum + v.ordersCompleted, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-text">Total Orders</div>
              </div>
              <Users className="w-8 h-8 text-navy" weight="duotone" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VendorsTable