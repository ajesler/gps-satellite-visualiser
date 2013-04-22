require 'json'

desc 'Process a GP* command log file and convert to JSON data'
# Uses bits of code from https://github.com/jgillick/ruby-serialgps/blob/master/lib/serialgps.rb
task :process_gps_log, :gps_file do |t, args|

	# call like 'rake process_gps_log['data/input/test_gps.log']'

	file = args[:gps_file]
	puts file

	dataPoints = []

	File.readlines(file).each do |line|

		dp = process(line)
		dataPoints << dp unless dp.nil?
	end

	output_file = 'data/output/satellite-data.json'
	File.open(output_file, 'w') { |file| file.write("gpsData="+dataPoints.to_json) }

	puts "Created output file #{output_file}"
end


def process(line)

	rGPRMC = /\$GPRMC.*?\*.{2}/
	rGPGSV = /\$GPGSV.*?\*.{2}/

	t = rGPRMC.match line
	h = nil
	unless t.nil?
		h = parse_gprmc(t[0])
		return nil unless h[:validity] == "A"

		h[:satellites] = []

		m = line.scan(rGPGSV)
		satellites = []

		unless m.nil?
			m.each do |c| 
				sv = parse_gpgsv(c) 
				h[:satellites_in_view] = sv[:satellites_in_view]
				sv[:satellites].each { |sd| h[:satellites] << sd }
			end
		end

		h[:epoch] = epoch_from_gprmc_data(h)
	end

	h unless h.nil? || h[:epoch].nil?
end

def parse_gprmc(sentence)

	parts = sentence.split(",")
	parts.shift

	data = {}
	data[:time] = parts.shift
	data[:validity] = parts.shift
	data[:lat] = parts.shift
	data[:lat_ref] = parts.shift
	data[:lng] = parts.shift
	data[:lng_ref] = parts.shift
	data[:speed] = parts.shift
	data[:course] = parts.shift
	data[:date] = parts.shift

	data[:lat] = latLngToDecimal(data[:lat], data[:lat_ref])
	data[:lng] = latLngToDecimal(data[:lng], data[:lng_ref])

	data
end

def parse_gpgsv(sentence)

	parts = sentence.split(/,|\*/)
	parts.shift

	data = {}
	data[:message_count] = parts.shift
	data[:message_num] = parts.shift
	data[:satellites_in_view] = parts.shift.to_i
	data[:satellites] = []

	# Satellite data
	4.times do |i|
		sd = {}
		sd[:number]       	= parts.shift
		sd[:elevation]		= parts.shift
		sd[:azimuth]		= parts.shift
		sd[:snr]			= parts.shift

		data[:satellites] << sd if sd.values.all? { |v| !v.nil? }
	end

	data
end

def epoch_from_gprmc_data(data)
	if !data.key?(:time) || data[:time].empty? || !data.key?(:date) || data[:date].empty?
		return nil
	end

	time = data[:time]
	date = data[:date]
	time.gsub!(/\.[0-9]*$/, "") # remove decimals
	datetime = "#{date} #{time} UTC"

	date =  DateTime.strptime(datetime, "%d%m%y %H%M%S %Z")
	date.to_time.to_i unless date.nil?
end

def latLngToDecimal(coord, ref)
	coord = coord.to_s
	decimal = nil

	# Find parts
	if coord =~ /^-?([0-9]*?)([0-9]{2,2}\.[0-9]*)$/
		deg = $1.to_i # degrees
		min = $2.to_f # minutes & seconds

		# Calculate
		decimal = deg + (min / 60)
		if ref == "S" || ref == "W"
			decimal *= -1
		end
	end

	decimal
end