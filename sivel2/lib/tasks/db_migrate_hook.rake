# frozen_string_literal: true

# Hook after db:migrate to sync Next.js schema.
# When Rails migrates, it also runs pending Next.js migrations and
# regenerates db/structure.sql + db/db.d.ts in apps/nextjs.
#
# The shared database is the source of truth — both sides must reflect it.
Rake::Task['db:migrate'].enhance do
  next if Rails.env.production? || Rails.env.staging?

  nextjs_dir = File.expand_path('../../apps/nextjs', __dir__)

  unless File.directory?(nextjs_dir)
    warn "  --> Skipping Next.js sync: #{nextjs_dir} not found"
    next
  end

  puts '  --> Syncing apps/nextjs schema and types...'
  system({ 'PATH' => ENV['PATH'] }, 'bin/m', 'db:migrate',
         chdir: nextjs_dir) || raise('bin/m db:migrate failed in apps/nextjs')
end
